import * as THREE from 'three/webgpu'
import { Game } from '../Game.js'
import { Floor } from './Floor.js'
import { Grid } from './Grid.js'
import { Grass } from './Grass.js'
import { color, float, Fn, instance, normalWorld, positionLocal, texture, vec3, vec4 } from 'three/tsl'
import { WaterSurface } from './WaterSurface.js'
import { Areas } from './Areas/Areas.js'
import { WindLines } from './WindLines.js'
import { Leaves } from './Leaves.js'
import { Lightnings } from './Lightnings.js'
import { Snow } from './Snow.js'
import { Whispers } from './Whispers.js'
import { VisualVehicle } from './VisualVehicle.js'
import { VisualTornado } from './VisualTornado.js'
import { Flowers } from './Flowers.js'
import { Bricks } from './Bricks.js'
import { Trees } from './Trees.js'
import { Bushes } from './Bushes.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'
import { Fireballs } from './Fireballs.js'
import { ExplosiveCrates } from './ExplosiveCrates.js'
import { RainLines } from './RainLines.js'
import { Confetti } from './Confetti.js'
import { Intro } from './Intro.js'
import { PoleLights } from './PoleLights.js'
import { Lanterns } from './Lanterns.js'
import { Fences } from './Fences.js'
import { Benches } from './Benches.js'
import { Scenery } from './Scenery.js'
import { Landmark } from './Landmark.js'
import { RaceTrack, TRACKS } from './RaceTrack.js'

export class World
{
    constructor()
    {
        this.game = Game.getInstance()

        this.step(0)

        // this.setAxesHelper()
        // this.setCollisionGroupsTest()
        // this.setNormalTest()
        // this.setTestMesh()
        // this.setTestShadow()
    }

    step(step)
    {
        if(step === 0)
        {
            // /playground: no reference grid — just the bare terrain
            if(!process.env.NEXT_PUBLIC_MINIMAL)
                this.grid = new Grid()
            this.intro = new Intro()
        }
        else if(step === 1)
        {
            // VITE_MINIMAL → the /playground build. Currently stripped right down to
            // just the (flat) terrain + the drivable vehicle — no trees, roads,
            // props, water, weather or interactive areas — as a clean sandbox to
            // rebuild the terrain on.
            const minimal = !!process.env.NEXT_PUBLIC_MINIMAL

            // /playground builds from a clone so the cached resource scene stays
            // pristine and can be re-cloned when the player swaps vehicles.
            this.currentVehicleKey = 'default'
            this.visualVehicle = new VisualVehicle(minimal
                ? this.game.resources.vehicle.scene.clone(true)
                : this.game.resources.vehicle.scene)
            this.floor = new Floor()

            if(minimal)
            {
                // original race track on the flat grid (restores saved selection,
                // builds it and drops the car on its start line)
                this.buildTrack(this.loadCustomization().track || TRACKS[0].key)
                // vehicle + paint + track selection (exposes window.playgroundApi)
                this.setupCustomization()
                // engine reads world.areas.<name> (guarded) — stub so it's safe
                this.areas = {}
            }
            else
            {
                // /world: full folio content
                this.waterSurface = new WaterSurface()
                this.birchTrees = new Trees('Birch Tree', this.game.resources.birchTreesVisualModel.scene, this.game.resources.birchTreesReferencesModel.scene.children, '#ff4f2b', '#ff903f')
                this.oakTrees = new Trees('Oak Tree', this.game.resources.oakTreesVisualModel.scene, this.game.resources.oakTreesReferencesModel.scene.children, '#b4b536', '#d8cf3b')
                this.cherryTrees = new Trees('Cherry Tree', this.game.resources.cherryTreesVisualModel.scene, this.game.resources.cherryTreesReferencesModel.scene.children, '#ff6d6d', '#ff9990')

                this.bushes = new Bushes()
                this.flowers = new Flowers()
                this.bricks = new Bricks()
                this.fences = new Fences()
                this.benches = new Benches()
                this.poleLights = new PoleLights()
                this.lanterns = new Lanterns()

                // Scenery is the folio's race-circuit installation (road + bridges +
                // basalt rocks lining the track) — out of place in the rural meadow,
                // so it's full-build only.
                this.scenery = new Scenery()
                this.grass = new Grass()
                this.windLines = new WindLines()
                this.confetti = new Confetti()
                this.leaves = new Leaves()
                this.rain = new RainLines()
                this.lightnings = new Lightnings()
                this.fireballs = new Fireballs()
                this.snow = new Snow()
                this.visualTornado = new VisualTornado()
                this.explosiveCrates = new ExplosiveCrates()
                this.areas = new Areas()
            }
        }
        else if(step === 2)
        {
            if(!process.env.NEXT_PUBLIC_MINIMAL)
                this.whispers = new Whispers()
        }
    }

    /**
     * /playground vehicle customization. Exposes window.playgroundApi so the React
     * wrapper (same-origin iframe) can drive vehicle + paint selection. Choices
     * persist in localStorage. Swapping rebuilds the VisualVehicle from a fresh
     * clone; the physics vehicle is untouched, so only the look changes.
     */
    setupCustomization()
    {
        this.vehicleDefs = [
            { key: 'default',   resource: 'vehicle',          label: 'Hatchback' },
            { key: 'oldSchool', resource: 'vehicleOldSchool', label: 'Old School' },
        ]
        this.paintNames = [ 'red', 'orange', 'white', 'black', 'flames', 'abyssal' ]
        this.currentPaint = null
        this.cameraModes = [ 'iso', 'third', 'first' ]
        this.currentCamera = 'iso'

        // restore saved choice
        const saved = this.loadCustomization()
        if(saved.vehicle && saved.vehicle !== this.currentVehicleKey)
            this.setVehicle(saved.vehicle, false)
        if(saved.paint)
            this.setPaint(saved.paint, false)
        if(saved.camera)
            this.setCamera(saved.camera, false)

        window.playgroundApi = {
            vehicles: this.vehicleDefs.map((v) => ({ key: v.key, label: v.label })),
            paints: this.paintNames,
            tracks: TRACKS.map((t) => ({ key: t.key, label: t.name, control: t.control })),
            cameras: [ { key: 'iso', label: 'Isometric' }, { key: 'third', label: 'Third person' }, { key: 'first', label: 'First person' } ],
            getState: () => ({
                vehicle: this.currentVehicleKey,
                paint: this.currentPaint,
                track: this.currentTrackKey,
                camera: this.currentCamera,
                muted: !!this.game.audio?.mute?.active,
            }),
            setVehicle: (key) => this.setVehicle(key, true),
            setPaint: (name) => this.setPaint(name, true),
            setTrack: (key) => this.setTrack(key, true),
            setCamera: (mode) => this.setCamera(mode, true),
            toggleSound: () => { this.game.audio?.mute?.toggle(); return !!this.game.audio?.mute?.active },
            restart: () => this.buildTrack(this.currentTrackKey),
        }
        window.dispatchEvent(new Event('playground-api-ready'))
    }

    buildTrack(key)
    {
        const layout = TRACKS.find((t) => t.key === key) || TRACKS[0]

        if(this.raceTrack)
            this.raceTrack.dispose()

        this.raceTrack = new RaceTrack(layout)
        this.currentTrackKey = layout.key

        // put the car (and the respawn point) on the new start/finish line
        const pose = this.raceTrack.startPose
        const landing = this.game.respawns.items?.get('landing')
        if(landing)
        {
            landing.position.copy(pose.position)
            landing.rotation = pose.rotation
        }
        if(this.game.physicalVehicle)
            this.game.physicalVehicle.moveTo(pose.position.clone(), pose.rotation)
    }

    setTrack(key, persist = true)
    {
        if(!TRACKS.find((t) => t.key === key))
            return
        this.buildTrack(key)
        if(persist)
            this.saveCustomization()
    }

    setVehicle(key, persist = true)
    {
        const def = this.vehicleDefs?.find((v) => v.key === key)
        if(!def || !this.game.resources[def.resource])
            return

        if(this.visualVehicle)
            this.visualVehicle.destroy()

        this.currentVehicleKey = def.key
        this.visualVehicle = new VisualVehicle(this.game.resources[def.resource].scene.clone(true))

        if(this.currentPaint)
            this.visualVehicle.paints.changeTo(this.currentPaint)

        if(persist)
            this.saveCustomization()
    }

    setPaint(name, persist = true)
    {
        if(!this.paintNames?.includes(name))
            return

        this.currentPaint = name
        if(this.visualVehicle?.paints)
            this.visualVehicle.paints.changeTo(name)

        if(persist)
            this.saveCustomization()
    }

    setCamera(mode, persist = true)
    {
        if(!this.cameraModes?.includes(mode))
            return

        this.currentCamera = mode
        this.game.view?.setPlaygroundCamera(mode)

        if(persist)
            this.saveCustomization()
    }

    loadCustomization()
    {
        try { return JSON.parse(window.localStorage.getItem('pg.customization') || '{}') }
        catch { return {} }
    }

    saveCustomization()
    {
        try {
            window.localStorage.setItem('pg.customization', JSON.stringify({
                vehicle: this.currentVehicleKey,
                paint: this.currentPaint,
                track: this.currentTrackKey,
                camera: this.currentCamera,
            }))
        } catch { /* storage disabled — ignore */ }
    }

    setPhysicalFloor()
    {
        this.game.objects.add(
            null,
            {
                type: 'fixed',
                friction: 0.25,
                restitution: 0,
                colliders: [
                    { shape: 'cuboid', parameters: [ 1000, 1, 1000 ], position: { x: 0, y: - 1.01, z: 0 }, category: 'floor' },
                ]
            }
        )
    }

    setTestKtx()
    {
        const mesh = new THREE.Mesh(
            new THREE.BoxGeometry(10, 10, 10),
            new THREE.MeshBasicNodeMaterial(),
        )
        mesh.material.outputNode = vec4(
            texture(this.game.resources.paletteTexture).rgb,
            1
        )
        mesh.position.copy(this.game.player.position)
        mesh.position.y += 2
        this.game.scene.add(mesh)
    }

    setTestShadow()
    {
        // Geometry
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5)

        // Material
        const material = new THREE.MeshLambertNodeMaterial()
        material.castShadowNode = vec4(0, 0, 0, 1)

        // Mesh
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.y = 2
        mesh.receiveShadow = true
        mesh.castShadow = true
        this.game.scene.add(mesh)

        // // Receiver
        // const receiver = new THREE.Mesh(
        //     new THREE.PlaneGeometry(3, 3),
        //     new THREE.MeshLambertNodeMaterial()
        // )
        // receiver.rotation.x = - Math.PI * 0.5
        // receiver.position.y = 1
        // receiver.receiveShadow = true
        // receiver.castShadow = true
        // this.game.scene.add(receiver)
    }


    setTestMesh()
    {
        console.log(this.game.rendering.renderer.library)
        const testMesh = new THREE.Mesh(
            new THREE.SphereGeometry(1, 32, 32),
            new THREE.MeshBasicMaterial()
        )
        // console.log(testMesh.material.outputNode = vec4(1, 0, 0, 1))
        // testMesh.material.outputNode = Fn(() =>
        // {
        //     return vec4(1, 0, 0, 1)
        // })()
        // setTimeout(() =>
        // {

        //     testMesh.material.outputNode = Fn(() =>
        //     {
        //         return vec4(1, 1, 0, 1)
        //     })()
        //     testMesh.material.needsUpdate = true
        // }, 2000)
        // testMesh.receiveShadow = true
        testMesh.position.z = 3
        this.game.scene.add(testMesh)

        // const testMesh2 = new THREE.Mesh(
        //     new THREE.SphereGeometry(1, 32, 32),
        //     new MeshDefaultMaterial({
        //         colorNode: color(0xffffff),
        //         hasCoreShadows: true,
        //         hasDropShadows: true,
        //     })
        // )
        // testMesh2.receiveShadow = true
        // testMesh2.position.x = 3
        // this.game.scene.add(testMesh2)
    }

    setAxesHelper()
    {
        const axesHelper = new THREE.AxesHelper()
        axesHelper.position.y = 0.1
        this.game.scene.add(axesHelper)
    }

    setCollisionGroupsTest()
    {
        // // Left (object)
        // this.game.objects.add(
        //     {
        //         type: 'dynamic',
        //         position: { x: 4, y: 2, z: 0.1 },
        //         colliders: [ { shape: 'cuboid', parameters: [ 0.5, 0.5, 0.5 ], category: 'object' } ]
        //     }
        // )

        // Right (terrain)
        this.game.objects.add(
            null,
            {
                type: 'dynamic',
                position: { x: 4, y: 2, z: -1.1 },
                colliders: [ { shape: 'cuboid', parameters: [ 0.5, 0.5, 0.5 ], category: 'floor' } ]
            }
        )

        // // Top (bumper)
        // this.game.objects.add(
        //     {
        //         type: 'dynamic',
        //         position: { x: 4, y: 4, z: -0.5 },
        //         colliders: [ { shape: 'cuboid', parameters: [ 0.5, 0.5, 0.5 ], category: 'bumper' } ]
        //     }
        // )
    }

    // setNormalTest()
    // {
    //     const geometry = new THREE.IcosahedronGeometry(1, 2)

    //     const material = new THREE.MeshLambertNodeMaterial()

    //     material.normalNode = normalView
    //     // const newNormal = 
    //     // material.normalNode = vec3(0, 1, 0)

    //     // material.positionNode = Fn(() =>
    //     // {
    //     //     // materialNormal.assign(vec3(0, 1, 0))
    //     //     return positionGeometry
    //     // })()
    //     material.outputNode = vec4(transformedNormalWorld, 1)

    //     const mesh = new THREE.Mesh(geometry, material)
    //     mesh.position.y = 2

    //     this.game.scene.add(mesh)
    // }
}