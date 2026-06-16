import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { color, float, Fn, fwidth, materialNormal, min, mix, mul, normalWorld, positionLocal, positionWorld, texture, uniform, uv, vec3, vec4 } from 'three/tsl'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

export class Floor
{
    constructor()
    {
        this.game = Game.getInstance()

        // Debug
        if(this.game.debug.active)
        {
            this.debugPanel = this.game.debug.panel.addFolder({
                title: '⏥ Floor',
                expanded: false,
            })
        }
        this.geometry = this.game.resources.terrainModel.scene.children[0].geometry
        this.subdivision = this.game.terrain.subdivision

        this.setVisual()
        this.setPhysical()
        this.setBedRock()

        this.game.ticker.events.on('tick', () =>
        {
            this.update()
        }, 10)
    }

    setVisual()
    {
        this.size = Math.round(this.game.view.optimalArea.radius * 2) + 1
        this.halfSize = this.size * 0.5
        this.cellSize = 1.5
        this.subdivisions = this.size / this.cellSize

        // Geometry
        let geometry = new THREE.PlaneGeometry(this.size, this.size, this.subdivisions, this.subdivisions)
        geometry.rotateX(-Math.PI * 0.5)
        geometry.deleteAttribute('normal')

        let material
        if(process.env.NEXT_PUBLIC_MINIMAL)
        {
            // /playground: raw unlit terrain with a world-space reference grid so
            // elevation/slopes are readable. The grid lives in the surface, so it
            // deforms with any displacement added later.
            material = new THREE.MeshBasicNodeMaterial()

            // anti-aliased line intensity (1 on a gridline, 0 between) for a vec2
            // expressed in cell units — crisp at any distance via screen derivatives.
            const gridLines = (cell) =>
            {
                const d = fwidth(cell)
                const g = cell.add(0.5).fract().sub(0.5).abs().div(d)
                return min(g.x, g.y).min(1).oneMinus()
            }

            material.colorNode = Fn(() =>
            {
                const base = vec3(0.82)
                const p = positionWorld.xz
                const minorLine = gridLines(p.div(2)).mul(0.45)   // every 2 units
                const majorLine = gridLines(p.div(10)).mul(0.7)   // every 10 units
                const darken = minorLine.add(majorLine).min(1)
                return base.mul(darken.oneMinus())
            })()
        }
        else
        {
            // Terrain data
            const terrainData = this.game.terrain.terrainNode(positionWorld.xz)
            const colorNode = Fn(() =>
            {
                return this.game.terrain.colorNode(terrainData)
            })()

            // Material
            material = new MeshDefaultMaterial({
                colorNode: colorNode,
                normalNode: vec3(0, 1, 0),
                shadowNode: terrainData.g,
                hasWater: false,
                hasLightBounce: false,
                wireframe: false
            })
            // Displacement
            material.positionNode = Fn(() =>
            {
                const uvDim = min(min(uv().x, uv().y).mul(20), 1)

                const newPosition = positionLocal
                newPosition.y.addAssign(terrainData.b.mul(-1.5).mul(uvDim))

                return newPosition
            })()
        }

        // Mesh
        this.mesh = new THREE.Mesh(geometry, material)
        this.mesh.receiveShadow = true
        // this.mesh.castShadow = true
        this.game.scene.add(this.mesh)

        // Resize
        this.game.viewport.events.on('throttleChange', () =>
        {
            this.size = Math.round(this.game.view.optimalArea.radius * 2) + 1
            this.halfSize = this.size * 0.5
            this.subdivisions = this.size
            
            geometry.dispose()
            
            geometry = new THREE.PlaneGeometry(this.size, this.size, this.subdivisions, this.subdivisions)
            geometry.rotateX(-Math.PI * 0.5)
            geometry.deleteAttribute('normal')

            this.mesh.geometry = geometry
        }, 2)
    }

    setPhysical()
    {
        // /playground: one huge flat collider so the (camera-following) grid feels
        // unlimited — you can never drive off the edge.
        if(process.env.NEXT_PUBLIC_MINIMAL)
        {
            const object = this.game.objects.add(
                null,
                {
                    type: 'fixed',
                    friction: 0.2,
                    restitution: 0.15,
                    colliders: [
                        { shape: 'cuboid', parameters: [ 5000, 1, 5000 ], position: { x: 0, y: -1, z: 0 }, category: 'floor' }
                    ]
                }
            )
            this.physical = object.physical
            return
        }

        // Extract heights from geometry
        const positionAttribute = this.geometry.attributes.position
        const totalCount = positionAttribute.count
        const rowsCount = Math.sqrt(totalCount)
        const heights = new Float32Array(totalCount)
        const halfExtent = this.game.terrain.size / 2

        for(let i = 0; i < totalCount; i++)
        {
            const x = positionAttribute.array[i * 3 + 0]
            const y = positionAttribute.array[i * 3 + 1]
            const z = positionAttribute.array[i * 3 + 2]
            const indexX = Math.round(((x / (halfExtent * 2)) + 0.5) * (rowsCount - 1))
            const indexZ = Math.round(((z / (halfExtent * 2)) + 0.5) * (rowsCount - 1))
            const index = indexZ + indexX * rowsCount

            // /playground: flat collider (the folio terrain dips to -1.5 in its own
            // water zones; zero it so the drivable surface and camera stay flat)
            heights[index] = process.env.NEXT_PUBLIC_MINIMAL ? 0 : y
        }

        const object = this.game.objects.add(
            null,
            {
                type: 'fixed',
                friction: 0.2,
                restitution: 0.15,
                colliders: [
                    { shape: 'heightfield', parameters: [ rowsCount - 1, rowsCount - 1, heights, { x: this.game.terrain.size, y: 1, z: this.game.terrain.size } ], category: 'floor' }
                ]
            }
        )
        this.physical = object.physical
    }

    setBedRock()
    {
        this.bedRock = {}
        this.bedRock.halfHeight = 0.5
        this.bedRock.halfWidth = 6
        this.bedRock.enabled = false


        this.bedRock.physical = this.game.physics.getPhysical({
            type: 'kinematicPositionBased',
            position: new THREE.Vector3(0, this.game.water.depthElevation - this.bedRock.halfHeight, 0),
            frictionRule: 'min',
            friction: 0.5,
            enabled: true,
            colliders:
            [
                { shape: 'cuboid', parameters: [ this.bedRock.halfWidth, this.bedRock.halfHeight, this.bedRock.halfWidth ] },
            ]
        })
    }

    update()
    {
        this.mesh.position.x = Math.round(this.game.view.optimalArea.position.x / this.cellSize) * this.cellSize
        this.mesh.position.z = Math.round(this.game.view.optimalArea.position.z / this.cellSize) * this.cellSize

        // Bedrock
        if(
            Math.abs(this.game.player.position.x) > this.game.terrain.size / 2 - this.bedRock.halfWidth ||
            Math.abs(this.game.player.position.z) > this.game.terrain.size / 2 - this.bedRock.halfWidth
        )
        {
            if(!this.bedRock.enabled)
            {
                this.bedRock.enabled = true
                this.bedRock.physical.body.setEnabled(true)
            }
            const x = Math.round(this.game.player.position.x)
            const z = Math.round(this.game.player.position.z)
            this.bedRock.physical.body.setNextKinematicTranslation({
                x,
                y: this.game.water.depthElevation - this.bedRock.halfHeight,
                z
            })
            this.bedRock.physical.body.setLinvel({ x: 0, y: 0, z: 0 })
        }
        else
        {
            if(this.bedRock.enabled)
            {
                this.bedRock.enabled = false
                this.bedRock.physical.body.setEnabled(false)
            }
        }
    }
}