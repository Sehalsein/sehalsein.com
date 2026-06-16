// /playground: adds Track + Car (garage) tabs to the folio's own menu, removes
// the home/welcome tab and the left preview images, and wires the buttons to
// window.playgroundApi (set by World.setupCustomization). Runs BEFORE the Menu is
// constructed so Menu.setItems() picks up the injected tabs automatically.

const PAINT_SWATCH = {
    red: '#ff2d2d',
    orange: '#ff940d',
    white: '#ffffff',
    black: '#2a2a2a',
    flames: 'linear-gradient(135deg,#ff9c20,#ff0000)',
    abyssal: 'linear-gradient(135deg,#6053ff,#1a1340)',
}

// rough closed SVG path through the track control points
function trackPath(control, size, pad)
{
    const xs = control.map((c) => c[0])
    const zs = control.map((c) => c[1])
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minZ = Math.min(...zs), maxZ = Math.max(...zs)
    const span = Math.max(maxX - minX, maxZ - minZ) || 1
    const scale = (size - pad * 2) / span
    const ox = (size - (maxX - minX) * scale) / 2 - minX * scale
    const oz = (size - (maxZ - minZ) * scale) / 2 - minZ * scale
    const pts = control.map(([x, z]) => `${(x * scale + ox).toFixed(1)},${(z * scale + oz).toFixed(1)}`)
    return `M${pts.join('L')}Z`
}

function markActive(container, active)
{
    for(const el of container.children) el.classList.remove('is-active')
    active.classList.add('is-active')
}

function selectByKey(container, items, currentKey)
{
    items.forEach((it, i) =>
    {
        container.children[i]?.classList.toggle('is-active', it.key === currentKey)
    })
}

function addTab(navigation, previews, contents, name, icon, title)
{
    const nav = document.createElement('button')
    nav.className = 'js-navigation-item item'
    nav.dataset.name = name
    nav.innerHTML = `<div class="button-inner"><div class="icon-container"><span class="pg-icon">${icon}</span></div></div>`
    navigation.insertBefore(nav, navigation.firstChild) // prepend (reverses order)

    const preview = document.createElement('div')
    preview.className = `js-preview preview ${name}-preview`
    previews.appendChild(preview)

    const content = document.createElement('div')
    content.className = `js-content content ${name}-content`
    content.innerHTML = `<div class="content-inner"><div class="title">${title}</div><div class="pg-body" data-pg="${name}"></div></div>`
    contents.appendChild(content)
}

function populate(api)
{
    const getState = () => api.getState()

    // Tracks
    const tracksBody = document.querySelector('.pg-body[data-pg="tracks"]')
    if(tracksBody && !tracksBody.dataset.filled)
    {
        tracksBody.dataset.filled = '1'
        const grid = document.createElement('div')
        grid.className = 'pg-grid cols-3'
        for(const t of api.tracks)
        {
            const card = document.createElement('button')
            card.className = 'pg-card'
            card.innerHTML = `<svg viewBox="0 0 100 100"><path d="${trackPath(t.control, 100, 16)}" fill="none" stroke="#cfd3d6" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/></svg><span>${t.label}</span>`
            card.addEventListener('click', () => { api.setTrack(t.key); markActive(grid, card) })
            grid.appendChild(card)
        }
        tracksBody.appendChild(grid)
        selectByKey(grid, api.tracks, getState().track)
    }

    // Cars (garage): vehicle + paint
    const carsBody = document.querySelector('.pg-body[data-pg="cars"]')
    if(carsBody && !carsBody.dataset.filled)
    {
        carsBody.dataset.filled = '1'

        const vLabel = document.createElement('div'); vLabel.className = 'pg-label'; vLabel.textContent = 'Vehicle'
        const vGrid = document.createElement('div'); vGrid.className = 'pg-grid cols-2'
        for(const v of api.vehicles)
        {
            const card = document.createElement('button')
            card.className = 'pg-card'
            card.innerHTML = `<span class="pg-emoji">🚗</span><span>${v.label}</span>`
            card.addEventListener('click', () => { api.setVehicle(v.key); markActive(vGrid, card) })
            vGrid.appendChild(card)
        }

        const pLabel = document.createElement('div'); pLabel.className = 'pg-label'; pLabel.textContent = 'Paint'
        const swatches = document.createElement('div'); swatches.className = 'pg-swatches'
        for(const name of api.paints)
        {
            const sw = document.createElement('button')
            sw.className = 'pg-swatch'
            sw.title = name
            sw.style.background = PAINT_SWATCH[name] || '#888'
            sw.addEventListener('click', () => { api.setPaint(name); markActive(swatches, sw) })
            swatches.appendChild(sw)
        }

        const cLabel = document.createElement('div'); cLabel.className = 'pg-label'; cLabel.textContent = 'Camera'
        const cGrid = document.createElement('div'); cGrid.className = 'pg-grid cols-3'
        for(const c of (api.cameras || []))
        {
            const card = document.createElement('button')
            card.className = 'pg-card'
            card.textContent = c.label
            card.addEventListener('click', () => { api.setCamera(c.key); markActive(cGrid, card) })
            cGrid.appendChild(card)
        }

        carsBody.append(vLabel, vGrid, pLabel, swatches, cLabel, cGrid)
        selectByKey(vGrid, api.vehicles, getState().vehicle)
        const paintItems = api.paints.map((p) => ({ key: p }))
        selectByKey(swatches, paintItems, getState().paint)
        selectByKey(cGrid, api.cameras || [], getState().camera)
    }
}

export function setupPlaygroundMenu()
{
    const navigation = document.querySelector('.js-navigation')
    const previews = document.querySelector('.js-previews')
    const contents = document.querySelector('.js-contents')
    if(!navigation || !previews || !contents)
        return

    // remove the home / welcome tab
    navigation.querySelector('[data-name="home"]')?.remove()
    previews.querySelector('.home-preview')?.remove()
    contents.querySelector('.home-content')?.remove()

    // add tabs (prepend → final order: Tracks, Cars, Options, Controls)
    addTab(navigation, previews, contents, 'cars', '🚗', 'Garage')
    addTab(navigation, previews, contents, 'tracks', '🏁', 'Tracks')

    const style = document.createElement('style')
    style.textContent = `
        .js-previews { display: none !important; }
        .menu .container .contents.js-contents { width: 100% !important; max-width: none !important; }
        .pg-icon { font-size: 20px; line-height: 1; }
        .pg-emoji { font-size: 22px; line-height: 1; }
        .pg-body { display: flex; flex-direction: column; gap: 10px; }
        .pg-label { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; opacity: .5; margin: 8px 0 2px; }
        .pg-grid { display: grid; gap: 12px; }
        .pg-grid.cols-3 { grid-template-columns: repeat(3, 1fr); }
        .pg-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
        .pg-card { display:flex; flex-direction:column; align-items:center; gap:8px; padding:12px; border:1px solid rgba(255,255,255,.15); border-radius:12px; background:transparent; color:#fff; cursor:pointer; font-size:13px; font-family:inherit; }
        .pg-card:hover { border-color: rgba(255,255,255,.45); }
        .pg-card.is-active { border-color:#fff; background:rgba(255,255,255,.1); }
        .pg-card svg { width:100%; height:72px; }
        .pg-swatches { display:flex; flex-wrap:wrap; gap:10px; }
        .pg-swatch { width:34px; height:34px; border-radius:50%; border:2px solid rgba(255,255,255,.25); cursor:pointer; padding:0; }
        .pg-swatch:hover { transform: scale(1.1); }
        .pg-swatch.is-active { border-color:#fff; }
    `
    document.head.appendChild(style)

    if(window.playgroundApi)
        populate(window.playgroundApi)
    else
        window.addEventListener('playground-api-ready', () => populate(window.playgroundApi), { once: true })
}
