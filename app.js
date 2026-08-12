// Basic vanilla JS app for Carta (no frameworks)
(function(){
  // Config
  const origin = { city: 'Esmeraldas', country: 'Ecuador', latitude: 0.965, longitude: -79.621 }
  const destination = { city: 'Acapulco', country: 'México', latitude: 16.8531, longitude: -99.8237 }
  const loveMessages = [
    'Recuerdo 1: Cuando reímos juntos en la lluvia.',
    'Recuerdo 2: Aquella canción que no podíamos dejar de tararear.',
    'Recuerdo 3: El primer café compartido en la madrugada.',
    'Recuerdo 4: Mirar estrellas y no decir nada.',
    'Recuerdo 5: Paseo inesperado por la ciudad.',
    'Recuerdo 6: Mensajes que iluminaban el día.',
    'Recuerdo 7: La promesa de volver a viajar juntos.',
    'Recuerdo 8: Esa mirada que lo decía todo.'
  ]

  // Configuration: number of stars and how many are interactive
  const STARS_COUNT = 100
  const INTERACTIVE_COUNT = Math.min(16, Math.floor(STARS_COUNT / 6)) // a subset

  // Elements
  const letterScreen = document.getElementById('letter-screen')
  const spaceScreen = document.getElementById('space-screen')
  const openBtn = document.getElementById('open-btn')
  const backBtn = document.getElementById('back-btn')
  const daysCounter = document.getElementById('days-counter')
  const toggleRouteBtn = document.getElementById('toggle-route')
  const routeCard = document.getElementById('route-card')
  const originLabel = document.getElementById('origin-label')
  const destLabel = document.getElementById('dest-label')
  const distanceLabel = document.getElementById('distance-label')
  const recList = document.getElementById('rec-list')
  const planet = document.getElementById('planet')
  const routeSvg = document.getElementById('route-svg')
  const planeEl = document.getElementById('plane')
  const modal = document.getElementById('modal')
  const modalText = document.getElementById('modal-text')
  const modalClose = document.getElementById('modal-close')
  const bgAudio = document.getElementById('bg-audio')

  // State
  let showRoute = false
  let viewed = JSON.parse(localStorage.getItem('viewed_stars')||'[]')
  let stars = []
  let interactiveIndices = []
  let planeRAF = null

  // Helper: days since
  function updateDays(){
    const start = new Date('2026-07-15T00:00:00')
    const now = new Date()
    const diff = now - start
    const days = Math.floor(diff / (1000*60*60*24))
    daysCounter.textContent = String(days)
  }

  // Helper: distance using Haversine formula
  function calculateDistanceKm(a, b){
    const R = 6371 // km
    const toRad = v => (v * Math.PI) / 180
    const dLat = toRad(b.latitude - a.latitude)
    const dLon = toRad(b.longitude - a.longitude)
    const lat1 = toRad(a.latitude)
    const lat2 = toRad(b.latitude)
    const aa = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLon/2)*Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa))
    return R * c
  }

  // Init rec list
  function renderRecList(){
    recList.innerHTML = ''
    loveMessages.forEach((m,i)=>{
      const li = document.createElement('li')
      const btn = document.createElement('button')
      btn.className = 'link'
      btn.textContent = 'Recuerdo ' + (i+1)
      btn.onclick = ()=>{ openModal(m); markViewed(i) }
      li.appendChild(btn)
      recList.appendChild(li)
    })
  }

  function openModal(text){
    modalText.textContent = text
    modal.classList.remove('hidden')
  }
  function closeModal(){ modal.classList.add('hidden') }

  modalClose.addEventListener('click', closeModal)
  modal.addEventListener('click', function(e){ if(e.target===modal) closeModal() })

  function markViewed(i){
    if(!viewed.includes(i)){
      viewed.push(i)
      localStorage.setItem('viewed_stars', JSON.stringify(viewed))
      renderStars() // update visuals
    }
  }

  // Stars
  function generateStars(){
    // pick interactive indices evenly distributed
    interactiveIndices = []
    const step = Math.floor(STARS_COUNT / INTERACTIVE_COUNT) || 1
    for(let i=0;i<INTERACTIVE_COUNT;i++){
      const base = i*step
      interactiveIndices.push(Math.min(STARS_COUNT-1, base + Math.floor(Math.random()*Math.max(1,step-1))))
    }

    stars = Array.from({length:STARS_COUNT}).map((_,i)=>({
      id:i,
      x: Math.random()*92 + 4, // padding
      y: Math.random()*84 + 6,
      interactive: interactiveIndices.includes(i)
    }))
  }

  function clearStars(){
    const existing = planet.querySelectorAll('.star')
    existing.forEach(n=>n.remove())
  }

  function renderStars(){
    clearStars()
    stars.forEach(s=>{
      const el = document.createElement('div')
      el.className = 'star' + (s.interactive? ' interactive':'' ) + (viewed.includes(s.id)? ' viewed':'')
      el.style.left = s.x + '%'
      el.style.top = s.y + '%'
      if(s.interactive){
        el.title = 'Toca para ver un recuerdo'
        el.tabIndex = 0
        el.onclick = ()=>{ openModal(loveMessages[s.id % loveMessages.length]); markViewed(s.id) }
      }
      planet.appendChild(el)
    })
  }

  // Markers
  function renderMarkers(){
    // remove old
    const old = planet.querySelectorAll('.marker')
    old.forEach(n=>n.remove())
    // origin
    const a = document.createElement('div')
    a.className = 'marker'
    a.style.left = '30%'
    a.style.top = '40%'
    a.innerHTML = '<div class="pin"></div><div class="label">'+origin.city+'</div>'
    planet.appendChild(a)
    // dest
    const b = document.createElement('div')
    b.className = 'marker'
    b.style.left = '70%'
    b.style.top = '30%'
    b.innerHTML = '<div class="pin"></div><div class="label">'+destination.city+'</div>'
    planet.appendChild(b)
  }

  // Route drawing (simple quadratic path in SVG using percent coords)
  function drawRoute(){
    routeSvg.innerHTML = ''
    const path = document.createElementNS('http://www.w3.org/2000/svg','path')
    const x1=30,y1=40,x2=70,y2=30,cx=50,cy=10
    path.setAttribute('d', `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`)
    path.setAttribute('stroke','#ffd27f')
    path.setAttribute('stroke-width','0.9')
    path.setAttribute('fill','none')
    path.setAttribute('vector-effect','non-scaling-stroke')
    routeSvg.appendChild(path)
  }

  // Plane animation along quadratic bezier
  function bezierPoint(t,p0,p1,p2){
    const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x
    const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y
    return {x,y}
  }

  function animatePlane(duration=8000){
    cancelAnimationFrame(planeRAF)
    planeEl.classList.remove('hidden')
    const start = performance.now()
    const p0={x:30,y:40}, p1={x:50,y:10}, p2={x:70,y:30}
    function frame(now){
      const t = Math.min(1,(now-start)/duration)
      const p = bezierPoint(t,p0,p1,p2)
      planeEl.style.left = p.x + '%'
      planeEl.style.top = p.y + '%'
      if(t<1) planeRAF = requestAnimationFrame(frame)
      else setTimeout(()=>planeEl.classList.add('hidden'),400)
    }
    planeRAF = requestAnimationFrame(frame)
  }

  // Toggle route
  function toggleRoute(){
    showRoute = !showRoute
    if(showRoute){
      routeCard.classList.remove('hidden')
      drawRoute()
      animatePlane(7000)
      tryPlayAudio()
      toggleRouteBtn.textContent = 'Ocultar ruta'
    } else {
      routeCard.classList.add('hidden')
      routeSvg.innerHTML = ''
      planeEl.classList.add('hidden')
      stopAudio()
      toggleRouteBtn.textContent = 'Mostrar ruta'
    }
  }

  // Audio helpers (simple fade)
  function tryPlayAudio(){
    if(!bgAudio) return
    bgAudio.volume = 0
    bgAudio.play().catch(()=>{})
    let v=0
    const iv = setInterval(()=>{ v = Math.min(1,v+0.05); bgAudio.volume = v; if(v>=1) clearInterval(iv) },100)
  }
  function stopAudio(){
    if(!bgAudio) return
    let v = bgAudio.volume
    const iv = setInterval(()=>{ v = Math.max(0, v-0.05); bgAudio.volume = v; if(v<=0){ bgAudio.pause(); clearInterval(iv) } },100)
  }

  // Boot
  function boot(){
    updateDays(); setInterval(updateDays, 60*1000)
    renderRecList()
    generateStars(); renderStars(); renderMarkers()
    originLabel.textContent = origin.city + ', ' + origin.country
    destLabel.textContent = destination.city + ', ' + destination.country
    const distKm = Math.round(calculateDistanceKm(origin, destination))
    distanceLabel.textContent = distKm + ' km'

    openBtn.addEventListener('click', ()=>{
      letterScreen.classList.add('hidden')
      spaceScreen.classList.remove('hidden')
      spaceScreen.setAttribute('aria-hidden','false')
    })
    backBtn.addEventListener('click', ()=>{
      spaceScreen.classList.add('hidden')
      letterScreen.classList.remove('hidden')
      spaceScreen.setAttribute('aria-hidden','true')
    })
    toggleRouteBtn.addEventListener('click', toggleRoute)

    // Keyboard accessibility for stars (delegation)
    planet.addEventListener('keydown', function(e){
      if(e.key === 'Enter' && document.activeElement && document.activeElement.classList.contains('star')){
        document.activeElement.click()
      }
    })
  }

  boot()
})();
