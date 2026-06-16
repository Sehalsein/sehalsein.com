import * as THREE from 'three/webgpu'
import { color, vec3 } from 'three/tsl'
import { Game } from '../Game.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

// Original circuits. All are convex rounded polygons (never self-intersect) with
// COLLINEAR points along their edges — those edges become real straights, and the
// start/finish is placed on the longest one.
// convex rounded polygon (collinear edge midpoints → real straights) — never
// self-intersects. mid = straight points per edge.
function roundedPolygon(n, R, sx, sz, rot, mid)
{
    const pts = []
    for(let i = 0; i < n; i++)
    {
        const a0 = rot + (i / n) * Math.PI * 2
        const a1 = rot + ((i + 1) / n) * Math.PI * 2
        const c0 = [Math.cos(a0) * R * sx, Math.sin(a0) * R * sz]
        const c1 = [Math.cos(a1) * R * sx, Math.sin(a1) * R * sz]
        pts.push(c0)
        for(let m = 1; m <= mid; m++) { const t = m / (mid + 1); pts.push([c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t]) }
    }
    return pts
}
// star-convex flowing loop (amp < base) — never self-intersects
function polarShape(n, base, amp, k, ph, sx = 1, sz = 1)
{
    const pts = []
    for(let i = 0; i < n; i++)
    {
        const a = (i / n) * Math.PI * 2
        const r = base + amp * Math.cos(k * a + ph)
        pts.push([Math.cos(a) * r * sx, Math.sin(a) * r * sz])
    }
    return pts
}

// 10 big, distinct circuits
export const TRACKS = [
    { key: 't1',  name: 'Grand Oval',  half: 6.5, control: roundedPolygon(4, 78, 1.5, 1.0, 0, 2) },
    { key: 't2',  name: 'Pentagon',    half: 6,   control: roundedPolygon(5, 75, 1.0, 1.0, 0.3, 1) },
    { key: 't3',  name: 'Hexa',        half: 6,   control: roundedPolygon(6, 72, 1.3, 1.0, 0, 1) },
    { key: 't4',  name: 'Triangle',    half: 6,   control: roundedPolygon(3, 84, 1.1, 1.2, 0.5, 2) },
    { key: 't5',  name: 'Diamond',     half: 6.5, control: roundedPolygon(4, 60, 1.0, 1.5, 0.785, 1) },
    { key: 't6',  name: 'Trefoil',     half: 5.5, control: polarShape(15, 75, 21, 3, 0) },
    { key: 't7',  name: 'Quatrefoil',  half: 5.5, control: polarShape(16, 69, 18, 4, 0.4, 1.2, 1) },
    { key: 't8',  name: 'Cinquefoil',  half: 5.5, control: polarShape(20, 69, 15, 5, 0) },
    { key: 't9',  name: 'Heptagon',    half: 6,   control: roundedPolygon(7, 69, 1.2, 1.0, 0.2, 1) },
    { key: 't10', name: 'Peanut',      half: 6,   control: polarShape(14, 75, 24, 2, 1.0, 1.3, 1) },
]

// Bruno-styled toon material (flat for ground pieces)
function styledMaterial(hex, flat = true)
{
    return new MeshDefaultMaterial({
        colorNode: color(hex),
        normalNode: flat ? vec3(0, 1, 0) : undefined,
        hasReveal: false,
        hasWater: false,
        hasLightBounce: false,
    })
}

/**
 * /playground custom race track — original closed-loop shape generated
 * procedurally, dressed in the folio's styling: toon-shaded asphalt, apex kerbs,
 * and SOLID tyre walls (from the car's own tyre mesh) on the corner exits.
 */
export class RaceTrack
{
    constructor(layout)
    {
        this.game = Game.getInstance()
        this.layout = layout
        this.group = new THREE.Group()
        this.game.scene.add(this.group)
        this.build()
    }

    pushTri(arr, a, b, c, y) { arr.push(a.x, y, a.z, b.x, y, b.z, c.x, y, c.z) }
    quad(arr, a, b, c, d, y) { this.pushTri(arr, a, b, c, y); this.pushTri(arr, a, c, d, y) }

    mesh(positions, material)
    {
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        const m = new THREE.Mesh(geometry, material)
        m.receiveShadow = true
        this.group.add(m)
        return m
    }

    build()
    {
        const control = this.layout.control.map(([x, z]) => new THREE.Vector3(x, 0, z))
        const half = this.layout.half
        const kerbW = 1.4

        const curve = new THREE.CatmullRomCurve3(control, true, 'catmullrom', 0.5)
        const N = 340

        const P = [], Norm = [], Tang = [], curvMag = []
        for(let i = 0; i < N; i++)
        {
            const u = i / N
            P.push(curve.getPointAt(u))
            const t = curve.getTangentAt(u)
            Tang.push(t)
            Norm.push(new THREE.Vector3(-t.z, 0, t.x).normalize())
        }
        for(let i = 0; i < N; i++)
        {
            const t0 = Tang[i], t1 = Tang[(i + 1) % N]
            curvMag.push(Math.abs(t0.x * t1.z - t0.z * t1.x))
        }
        const edge = (i, off) => P[i].clone().addScaledVector(Norm[i], off)

        // corner detection + apex side (inside of the bend)
        const corner = curvMag.map((c) => c > 0.012)
        const isCorner = corner.slice()
        for(let i = 0; i < N; i++)
            if(corner[i])
                for(let d = -6; d <= 6; d++) isCorner[(i + d + N) % N] = true

        const insideSide = new Array(N).fill(0)
        for(let i = 0; i < N; i++)
        {
            if(!isCorner[i]) continue
            const ta = Tang[(i - 5 + N) % N], tb = Tang[(i + 5) % N]
            insideSide[i] = tb.clone().sub(ta).dot(Norm[i]) >= 0 ? 1 : -1
        }

        // put the start/finish on the straightest sample (lowest curvature)
        let startIdx = 0, flattest = Infinity
        for(let i = 0; i < N; i++) { if(curvMag[i] < flattest) { flattest = curvMag[i]; startIdx = i } }
        const t0 = Tang[startIdx]
        this.startPose = {
            position: new THREE.Vector3(P[startIdx].x, 2, P[startIdx].z),
            rotation: Math.atan2(-t0.z, t0.x),
        }

        // road
        const road = []
        for(let i = 0; i < N; i++)
        {
            const j = (i + 1) % N
            this.quad(road, edge(i, -half), edge(i, half), edge(j, half), edge(j, -half), 0.03)
        }
        this.mesh(road, styledMaterial('#33313a'))

        // kerb — a SINGLE constant-width strip on the OUTER (convex) edge of each
        // corner. The outer side is a constant offset of the smooth road edge, so it
        // always rounds cleanly and never folds (the inner/apex side, which would
        // fold on tight bends, is intentionally left plain).
        const kerbRed = [], kerbWhite = []
        const addKerbStrip = (arr, i, j, s) =>
        {
            const ai = edge(i, s * half), oi = edge(i, s * (half + kerbW))
            const aj = edge(j, s * half), oj = edge(j, s * (half + kerbW))
            // wind the quad from the inner→outer cross-offset matching the road, so
            // the face stays up-facing for EITHER side (FrontSide would cull a flip)
            if(s >= 0) this.quad(arr, ai, oi, oj, aj, 0.045)
            else       this.quad(arr, oi, ai, aj, oj, 0.045)
        }
        for(let i = 0; i < N; i++)
        {
            if(!isCorner[i]) continue
            const j = (i + 1) % N
            const arr = (Math.floor(i / 4) % 2) ? kerbRed : kerbWhite
            addKerbStrip(arr, i, j, -insideSide[i] || 1) // outer/convex side only
        }
        this.mesh(kerbRed, styledMaterial('#c01818'))
        this.mesh(kerbWhite, styledMaterial('#e9e9e9'))

        // start / finish checkered band
        const startBlack = [], startWhite = []
        const cells = 8, depth = 4
        for(let k = 0; k < cells; k++)
        {
            const o0 = -half + (2 * half) * (k / cells)
            const o1 = -half + (2 * half) * ((k + 1) / cells)
            const a = edge(startIdx, o0), b = edge(startIdx, o1)
            const c = P[startIdx].clone().addScaledVector(Norm[startIdx], o1).addScaledVector(t0, depth)
            const d = P[startIdx].clone().addScaledVector(Norm[startIdx], o0).addScaledVector(t0, depth)
            this.quad((k % 2) ? startBlack : startWhite, a, b, c, d, 0.06)
        }
        this.mesh(startWhite, styledMaterial('#ededed'))
        this.mesh(startBlack, styledMaterial('#161616'))

        this.buildTyreWalls(P, Norm, isCorner, insideSide, curvMag, half, kerbW)
    }

    // SOLID tyre walls — one short section at each corner's apex, on the run-off
    // (outside), built from the CAR'S OWN tyre mesh. Adds matching physics so the
    // car can't drive through.
    buildTyreWalls(P, Norm, isCorner, insideSide, curvMag, half, kerbW)
    {
        const tyreNode = this.game.resources.vehicle.scene.getObjectByName('wheel006')
        if(!tyreNode) return

        const tyreGeo = tyreNode.geometry.clone()
        tyreGeo.rotateX(Math.PI / 2)
        tyreGeo.scale(1.3, 1.3, 1.3)

        const N = P.length
        const off = half + kerbW + 0.9

        // group consecutive corner samples (with wrap-around merge)
        const groups = []
        let i = 0
        while(i < N) { if(!isCorner[i]) { i++; continue } let a = i; while(i < N && isCorner[i]) i++; groups.push([a, i - 1]) }
        if(groups.length > 1 && isCorner[0] && isCorner[N - 1])
        {
            const f = groups.shift(), l = groups.pop()
            groups.push([l[0], f[1] + N])
        }

        const placements = { green: [], white: [] }
        const colliders = []

        for(const [a, b] of groups)
        {
            // apex = sharpest sample in the group
            let apex = a, best = -1
            for(let k = a; k <= b; k++) { const idx = ((k % N) + N) % N; if(curvMag[idx] > best) { best = curvMag[idx]; apex = k } }
            const span = Math.min(5, Math.max(2, Math.floor((b - a) / 2)))
            const apexSide = -insideSide[((apex % N) + N) % N] || 1   // run-off side

            for(let k = apex - span; k <= apex + span; k++)
            {
                const idx = ((k % N) + N) % N
                const base = P[idx].clone().addScaledVector(Norm[idx], apexSide * off)
                for(let s = 0; s < 3; s++)
                    (((idx + s) % 2) ? placements.green : placements.white).push({ x: base.x, y: 0.34 + s * 0.66, z: base.z })
                colliders.push({ shape: 'cuboid', parameters: [0.85, 1.1, 0.85], position: { x: base.x, y: 1, z: base.z }, category: 'floor' })
            }
        }

        const addStack = (list, hex) =>
        {
            if(!list.length) return
            const inst = new THREE.InstancedMesh(tyreGeo, styledMaterial(hex, false), list.length)
            const m = new THREE.Matrix4()
            list.forEach((p, idx) => { m.makeTranslation(p.x, p.y, p.z); inst.setMatrixAt(idx, m) })
            inst.instanceMatrix.needsUpdate = true
            inst.castShadow = true
            this.group.add(inst)
        }
        addStack(placements.green, '#1f5c3a')
        addStack(placements.white, '#e6e6e6')

        // one fixed body for all wall colliders (created outside the objects list
        // so it can be removed cleanly on track switch)
        if(colliders.length)
            this.wallPhysical = this.game.physics.getPhysical({ type: 'fixed', friction: 0.5, restitution: 0.3, colliders })
    }

    dispose()
    {
        if(this.wallPhysical)
        {
            this.game.physics.world.removeRigidBody(this.wallPhysical.body)
            this.wallPhysical = null
        }
        this.group.traverse((o) =>
        {
            if(o.geometry) o.geometry.dispose()
            if(o.material) o.material.dispose()
        })
        this.game.scene.remove(this.group)
    }
}
