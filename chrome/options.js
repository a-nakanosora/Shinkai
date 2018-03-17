/**
localStorage.shinkaiopt : JSON { ck, cks }
*/

document.addEventListener('DOMContentLoaded', e=>{
  if(!localStorage.shinkaiopt)
    localStorage.shinkaiopt = JSON.stringify({})

  const {ck,cks} = JSON.parse(localStorage.shinkaiopt)

  document.getElementById('ck').value = ck || ''
  document.getElementById('cks').value = cks || ''
})

document.getElementById('save').addEventListener('click', e=>{
  const ck = document.getElementById('ck').value
  const cks = document.getElementById('cks').value

  localStorage.shinkaiopt = JSON.stringify({ck, cks})

  const status = document.getElementById('status')
  status.textContent = 'saved.'
  setTimeout(_=>{
    status.textContent = ''
  }, 750)
})
