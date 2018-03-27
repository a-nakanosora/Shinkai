'use strict'

var {getResizedImage} = (()=>{
  const _export = {}

  function getResizedImage(imgSrcUrl, callback, {maxSize=32, imageSmoothingEnabled=false}={}){
    let img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = e=>{
      const w0 = img.naturalWidth
      const h0 = img.naturalHeight
      assert(w0 && h0)

      const k = Math.max(w0, h0)
      const W = Math.floor(maxSize*w0/k)
      const H = Math.floor(maxSize*h0/k)
      const cnv = document.createElement('canvas')
      cnv.width = W
      cnv.height = H
      const ctx = cnv.getContext('2d')
      ctx.imageSmoothingEnabled = imageSmoothingEnabled
      ctx.drawImage(img, 0,0,w0,h0, 0,0,W,H)

      const du = cnv.toDataURL('image/png')
      callback(du)

      ///
      img.src = ''
      img = null
    }
    img.src = imgSrcUrl
  }
  _export.getResizedImage = getResizedImage

  return _export
})()

