'use strict'

const {spiral, wave} = (()=>{

function spiral(i, coef){
  const {radius, h, offset} = coef

  // const len = t=>1/2*t*Math.sqrt(1+t**2) + 1/2*Math.log(Math.sqrt(1+t**2)+t)
  // const len = t=>1/2*t*Math.sqrt(1+t**2)
  // const tByLen = l=> l<=1/16 ? 0 : Math.sqrt(4*l-1/4)
  const tByLen = l=> Math.sqrt(4*(1/16+l)-1/4)

  const t = tByLen(i*h+offset)

  const x = Math.round( t * Math.cos(t) * radius )
  const y = Math.round( t * Math.sin(t) * radius )
  return [x,y]
}

const waveCache = {}
const waveCacheRef = {}
function wave(i, waveCoef){
  assert(i%1===0)

  // waveCoef = waveCoef || {
  //     n:13, kx:950, ky:400, k:4, offset:.2, viewOffset:.5,
  //   }
  const {n, kx, ky, k, offset, viewOffset} = waveCoef
  const cacheName = `_curveCache#${JSON.stringify(waveCoef)}`

  if(!waveCache[cacheName]) {
    function getPoint(t){
      assert(t >= 0 && t<=1.0)
      // t*=1.06 /// test
      // t*=.8 /// test

      const g = (t,k)=> (0<=t&&t<=.5) ? (2*t)**k/2 : (.5<=t&&t<=1) ? ((1-(2*(1-t))**k)/2+.5) : 0
      const h = t=> (0<=t&&t<=.5) ?  g(2*t,k) : (.5<=t&&t<=1) ? g(2-2*t,k) : 0

      const tx = h((t+offset)%1.0)
      const ty = t
      // const ty = (t%1.0)
      // const ty2 = ty-tx*.4
      // const ty2 = ty+tx*.1
      const ty2 = ty
      const x = Math.round( (tx-viewOffset)* kx )
      // const y = Math.round( (ty-viewOffset) * ky )
      // const y = Math.round( (ty) * ky )
      const y = Math.round( (ty2) * ky )
      return {x,y}
    }

    const ps = []
    for(const i of range(n))
      ps.push(getPoint(i/n))

    waveCache[cacheName] = resamplePoints(ps, n)
    waveCacheRef[cacheName] = getPoint(1.0)
  }
  const nn = waveCache[cacheName].length
  const {x,y} = waveCache[cacheName][i%nn]
  const refY = waveCacheRef[cacheName].y
  return [x, y + refY*Math.floor(i/nn)]

}


function resamplePoints(ps0, resolution=10){
  /// e.g. resamplePoints([{x:0,y:0},{x:30,y:30},{x:100,y:100}], 5)
  assert(ps0.length >= 2)
  assert(resolution >= 2)
  assert(ps0.every(p=>istype(p.x, 'Number') && istype(p.y, 'Number') ))

  let lineLengthAll = 0
  for(const [a,b] of pairs(ps0))
    lineLengthAll += Math.sqrt((a.x-b.x)**2 + (a.y-b.y)**2)

  let lineLength = 0
  const [head, tail] = tips(ps0).map(p=>osel(p, 'x,y'))
  const ps = []
  ps.push(head)
  for(let i=0; i<ps0.length-1;) {
    if(ps.length>=resolution-1)
          break /// #test

    const a = ps0[i]
    const b = ps0[i+1]
    const ba = {x:b.x-a.x, y:b.y-a.y}
    const d = Math.sqrt(ba.x**2 + ba.y**2)

    const refLen = lineLengthAll*ps.length/(resolution-1)
    const lineLengthNext = lineLength+d
    if(d>0 && lineLength <= refLen && refLen < lineLengthNext) {
      const ss = (refLen-lineLength)/d
      const p = {x:a.x+ba.x*ss, y:a.y+ba.y*ss}
      ps.push(p)
    } else {
      lineLength = lineLengthNext
      i++
    }
  }
  ps.push(tail)
  return ps
}


return {spiral, wave}
})()

