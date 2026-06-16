// Next-native entry for the folio-derived engine (replaces the old Vite index.js).
// Imported only on the client by the React host. Boots the Game singleton against
// the DOM scaffold the host has already mounted.
import './threejs-override.js'
import { Game } from './Game/Game.js'

let booted = false

export function bootPlayground()
{
    // guard against React strict-mode double-invoke
    if(booted)
        return Game.getInstance()
    booted = true

    if(process.env.NEXT_PUBLIC_MINIMAL)
    {
        // Minimal /playground: strip all folio chrome — the menu/map triggers,
        // achievement + notification popups, touch buttons — leaving just the
        // canvas (infinite grid plane + track + car).
        const style = document.createElement('style')
        style.textContent = `
            .js-menu-trigger,
            .js-map-trigger,
            .js-menu,
            .js-notifications,
            .js-touch-buttons,
            .js-modals { display: none !important; }
        `
        document.head.appendChild(style)
    }

    const game = new Game()
    window.game = game
    return game
}

export function disposePlayground()
{
    // best-effort teardown so the page can re-init on remount
    try
    {
        const game = Game.getInstance && Game.getInstance()
        if(game)
        {
            game.ticker?.stop?.()
            game.rendering?.renderer?.dispose?.()
        }
    }
    catch { /* ignore */ }
    Game.instance = null
    booted = false
}
