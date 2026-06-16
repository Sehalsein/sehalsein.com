import * as THREE from 'three/webgpu'
import { color } from 'three/tsl'
import { Game } from '../Game.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

/**
 * Minimal /playground payoff content (Meadow Vale):
 *  - a windmill landmark at the summit of the NE hill (the reward for driving
 *    the spiral road up), with slowly turning sails;
 *  - a drivable jump ramp out on the meadow.
 *
 * Heights are taken from the SAME elevation() the terrain uses (see Floor.js /
 * scripts/genTerrain.mjs), so the props sit flush on the rolling ground.
 */
// terrain is flat now (elevation removed), so props sit at ground level
const elevation = (x, z) => 0

export class Landmark
{
    constructor()
    {
        this.game = Game.getInstance()
        this.group = new THREE.Group()
        this.game.scene.add(this.group)

        this.setWindmill(54, 44)
        this.setRamp(-20, 20)

        this.game.ticker.events.on('tick', () =>
        {
            if(this.sails)
                this.sails.rotation.x += 0.012
        }, 10)
    }

    mat(hex, side = THREE.FrontSide)
    {
        return new MeshDefaultMaterial({ colorNode: color(hex), side })
    }

    addMesh(geometry, material, x, y, z)
    {
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(x, y, z)
        mesh.castShadow = true
        mesh.receiveShadow = true
        this.group.add(mesh)
        return mesh
    }

    setWindmill(x, z)
    {
        const g = elevation(x, z)
        const wall = this.mat('#e8ddc4')
        const roof = this.mat('#5a4633')
        const wood = this.mat('#8a6a44')

        // tapered tower body
        const bodyH = 6.5
        this.addMesh(new THREE.CylinderGeometry(1.5, 2.2, bodyH, 18), wall, x, g + bodyH / 2, z)
        // conical roof
        this.addMesh(new THREE.ConeGeometry(2.4, 2.2, 18), roof, x, g + bodyH + 1.1, z)
        // little door at the base (facing -x, the road approach)
        this.addMesh(new THREE.BoxGeometry(0.3, 1.8, 1.1), roof, x - 2.05, g + 0.9, z)

        // sails: 4 blades on a hub on the +x face, spinning around the x axis
        this.sails = new THREE.Group()
        this.sails.position.set(x + 2.1, g + bodyH - 0.6, z)
        const blade = new THREE.BoxGeometry(0.25, 5, 0.7)
        blade.translate(0, 2.6, 0)
        for(let i = 0; i < 4; i++)
        {
            const b = new THREE.Mesh(blade, wood)
            b.rotation.x = (i * Math.PI) / 2
            b.castShadow = true
            this.sails.add(b)
        }
        this.sails.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.6, 12).rotateZ(Math.PI / 2), roof))
        this.group.add(this.sails)

        // collision: a fixed cylinder so the car bumps the tower, not drives through
        this.game.objects.add(null, {
            type: 'fixed',
            position: new THREE.Vector3(x, g + bodyH / 2, z),
            friction: 0.4,
            restitution: 0.1,
            colliders: [ { shape: 'cylinder', parameters: [ bodyH / 2, 2.2 ] } ],
        })
    }

    setRamp(x, z)
    {
        const g = elevation(x, z)
        // triangular-prism wedge: rises from x=-3 (h=0) to x=+3 (h=2.2),
        // extruded z=-2.5..2.5 — drive in +x to launch off the top edge.
        const hx = 3, hz = 2.5, h = 2.2
        const v = [
            [-hx, 0, -hz], [hx, 0, -hz], [hx, h, -hz], // -z cap
            [-hx, 0, hz], [hx, 0, hz], [hx, h, hz],     // +z cap
        ]
        const tris = [
            [0, 1, 2], [3, 5, 4],                 // end caps
            [0, 3, 4], [0, 4, 1],                 // bottom
            [1, 4, 5], [1, 5, 2],                 // vertical back (x=+3)
            [0, 2, 5], [0, 5, 3],                 // inclined top
        ]
        const positions = []
        for(const [a, b, c] of tris)
            for(const idx of [a, b, c]) positions.push(...v[idx])
        const geometry = new THREE.BufferGeometry()
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.computeVertexNormals()
        this.addMesh(geometry, this.mat('#9c7048', THREE.DoubleSide), x, g, z)

        // drivable collider: convex hull of the same 6 wedge vertices
        this.game.objects.add(null, {
            type: 'fixed',
            position: new THREE.Vector3(x, g, z),
            friction: 0.6,
            restitution: 0,
            colliders: [ { shape: 'hull', parameters: [ new Float32Array(v.flat()) ], category: 'floor' } ],
        })
    }
}
