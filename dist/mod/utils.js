'use strict'

const html = s => document.createRange().createContextualFragment(s.trim()).firstChild
function redirect(url){ location.href = url }


function $d(ns){
    /// extractor
    /// e.g.  $d`a, b`({a:123, b:"abc", c:"zzz"})
    ///       [{a:123, b:"abc", c:"zzz"}].map($d`a b`)
    // const ks = (ns.raw ? ns[0] : ns).split(/\,/g).map(s=>s.trim())
    const ks = (ns.raw ? ns[0] : ns).split(/[\,\s]+/g).map(s=>s.trim())
    return obj=>{
        const o = {}
        ks.forEach(k=>{ o[k]=obj[k] })
        return o
    }
}

function eachSlice(arr, size){
  const a = []
  for (let i=0, l=arr.length; i<l; i+=size)
    a.push(arr.slice(i, i+size))
  return a
}

function arrlast(arr){
  return arr.length ? arr[arr.length-1] : null
}

function arrRemoved(arr, v){
  let a = arr.concat()
  let i
  while((i = a.indexOf(v)) > -1)
    a.splice(i,1)
  return a
}

function assert(b,msg='',obj=null){
  if(!b) {
    if(obj)
      console.warn(...['Assertion Error:', msg, obj].filter(v=>!!v))
    throw new Error(msg ? 'Assertion Error: '+msg : 'Assertion Error.')
  }
}

function istype(v, type){
  /// istype(123, 'Number')
  /// istype(null, 'Number')
  /// istype(null, 'Number?')
  assert(typeof type === 'string')
  let nullable = false
  if(type.endsWith('?')) {
    nullable = true
    type = type.slice(0,-1)
  }
  const b = (nullable && v===null) || (
            type==='Object' ? isobj(v)
            : type==='Array' ? v instanceof Array
            : type==='String' ? typeof v === 'string'
            : type==='Number' ? typeof v === 'number'
            : null)
  if(b===null)
    throw new Error(`istype Error: invalid type: ${type}`)
  return b
}
function assertype(v, type, msg='', obj=null){
  /// assertype(123, 'Number')
  /// assertype(null, 'Number')
  /// assertype(null, 'Number?')
  if(!istype(v,type)) {
    /*const s = `assertype Assertion Error: \`${
                 typeof v === 'string' ? '"'+v+'"' : String(v)
                 }\` is not a \`${type}\``*/
    const s = 'assertype Assertion Error'
    console.error('assertype Assertion Error:', typeof v === 'string' ? '"'+v+'"' : v, 'is not a', type)
    if(obj)
      console.warn(...[s+':', msg, obj].filter(v=>!!v))
    throw new Error(msg ? s+': '+msg : s+'.')
  }
}

function $switch(n, o){
  /**
  e.g.
    $switch("x", {x:123, y:_=>456, default:789})
  e.g.
    void async function(){
      console.log(1)
      const res = await $switch2('x', {
          x: async _=>{
            console.log("a")
            await sleep(1000)
            console.log("b")
            return 123
          },
        })
      console.log(2, res)
    }()
  */
  const a = n in o ? o[n] : 'default' in o ? o['default'] : null
  if(!a)
    return null
  return typeof a === 'function' ? a() : a
}
function $switch2(n,o){
  if(!(n in o))
    throw new Error('$switch2 Error: invalid key: '+n)
  return $switch(n,o)
}



function sleep(interval){
  return new Promise(ok=>setInterval(ok, interval))
}
const lag = ()=>sleep(1)

function* pairs(arr){
  if(arr.length <= 1)
      throw new Error('pairs Error: no pairs.')

  for(let i=0, l=arr.length; i<l-1; i++)
      yield [arr[i], arr[i+1]]
}

function tips(arr){
    if(arr.length === 0)
        throw new Error('tips Error: 0 length.')
    return [arr[0], arr[arr.length-1]]
}

function* zip(a,b){
  const l = Math.min(a.length, b.length)
  for(let i=0; i<l; i++)
    yield [a[i], b[i]]
}

function* range(begin, end=null){
  if(end===null)
    [begin,end] = [0,begin]
  for (let i=begin; i<end; i++)
    yield i
}

class ThrottleTime {
  static create(){
    function throttle(thres=10){
      const t0 = throttle.t || 0
      const t = Date.now()
      if(t-t0 < thres)
        return true
      throttle.t = t
      return false
    }
    return throttle
  }
}

function _do(f){
  return f()
}

function isobj(o){return o.constructor === Object}

function clone(v){
  /// shallow copy
  if(isobj(v)) {
    const o = {...v}
    // return Object.isFrozen(v) ? Object.freeze(o) :
    return Object.isSealed(v) ? Object.seal(o) : o
  } else if(v instanceof Array)
    return [...v]
  else {
    console.warn('clone Error: unsupported type: ', v)
    throw new Error('clone Error: unsupported type: '+v)
  }
}

function omap(obj, f){
  /// e.g. omap({x:123, y:456}, v=>v*2)
  const o = {}
  Object.entries(obj).map(([n,v])=>o[n]=f(v, n))
  return o
}

function ofilter(obj, f){
  /// e.g. ofilter({x:123, y:456}, v=>v>200)
  const o = {}
  Object.entries(obj).map(([n,v])=>{
    if(f(v, n))
      o[n]=v
  })
  return o
}

function oset(keys){
  /// e.g. oset(['foo', 'bar'])
  const o = {}
  keys.forEach(s=> o[s]=true)
  return o
}

/**
osel(obj, selstr)
e.g.
  osel({
    a:[7,6,5,4,3],
    b:123,
    c:456,
    e: { f: { bar:'bbb' }, },
    x: [{y:1,z:2}, {y:3}, {z:4}],
    ho: [
      { ge:[ {piyo:1}, {piyo:2}, {piyo:3}], hhgg: -1, },
      { ge:[ {piyo:4}, {piyo:5}, {piyo:6}], hhgg: -2, },
    ],
    "test test": 123,
    "te-st-2": 456,
  }, `
      a[],
      b[],
      c,
      e[],
      x[]: { y },
      ho[]:{
        ge[]:{piyo},
        hhgg,
      },
      "test test",
      te-st-2,
  `)
*/
window.osel = _do(_=>{
  function makeKeySelector(keys0){
    const s00 = keys0.raw ? keys0.raw[0] : keys0
    const s0 = s00.trim()[0]==='{' ? s00 : '{'+s00+'}'

    if(!makeKeySelector._caches)
      makeKeySelector._caches = {}
    if(makeKeySelector._caches[s0])
      return makeKeySelector._caches[s0]

    const stack = []
    let m
    let i=0
    let s = s0
    while(m = s.match(/{[^{}]+}/)) {
      const id = `##BLOCK${i++}##`
      stack.push({s:m[0], id})
      s = s.replace(/{[^{}]+}/, id)
    }

    ///
    const readKey = s=> s.match(/^\s*'(?:\\'|[^'])+'/) || s.match(/^\s*"(?:\\"|[^"])+"/) || s.match(/^\s*[a-z\d_$\-]+/i)
    const f = s0=>{
      assert(s0[0]==='{' && s0[s0.length-1]==='}')
      const s = s0.slice(1,-1)
      assert(!s.match(/{|}/))

      const res = {}

      let d = s
      let lim=0
      while(d){
        if(lim++>10000)
          throw new Error('limit exceeded.')
        const m = readKey(d)
        assert(m)

        const key = m[0].trim().replace(/^['"]\s*/, '').replace(/\s*['"]$/, '')
        let arraySelector = false
        const rest = (_=>{
          const a = d.slice(m[0].length).trim()
          if(a.match(/^\[\s*\]/)) {
            arraySelector = true
            return a.replace(/^\[\s*\]/, '')
          }
          return a
        })()

        if(rest.match(/^\,|^\s*$/)) {
          res[key] = {arraySelector}
          d = rest.replace(/^\,|^\s*$/, '').trim()
        } else if(rest.match(/:\s*##BLOCK\d+##\s*\,?/)){
          res[key] = {blockId: rest.match(/:\s*(##BLOCK\d+##)\s*\,?/)[1], arraySelector}
          d = rest.replace(/:\s*##BLOCK\d+##\s*\,?/, '').trim()
        } else {
          throw new Error('osel error')
        }
      }
      return res
    }

    const dict = {}
    const root = stack[stack.length-1]
    for(const {s, id} of stack) {
      dict[id] = f(s)
    }


    const ksel = {root: dict[root.id], dict}
    makeKeySelector._caches[s0] = ksel
    return ksel
  }


  function extractBySelector(obj, ksel){
    const rec = (target, sel, dict)=>{
      const o={}
      for(const [key, s] of Object.entries(sel)) {
        if(s.arraySelector) {
          if(!(target[key] instanceof Array))
            continue

          const arr = []
          if(s.blockId) {
            assert(dict[s.blockId])
            target[key].filter(v=>isobj(v)).forEach(v=>{
              const o2 = rec(v, dict[s.blockId], dict)
              if(Object.keys(o2).length)
                arr.push(o2)
            })

          } else {
            /// shallow copy of the array
            arr.push(...target[key])
          }
          o[key] = arr

        } else if(s.blockId) {
          assert(dict[s.blockId])
          if(key in target && isobj(target[key])) {
            const o2 = rec(target[key],dict[s.blockId], dict)
            o[key] = o2
          }
        } else {
          if(key in target) {
            o[key] = target[key]
          }
        }
      }
      return o
    }
    const a = rec(obj, ksel.root, ksel.dict)
    return a
  }

  function osel(obj, selstr){
    return extractBySelector(obj, makeKeySelector(selstr))
  }

  return osel
})



function ohas(obj, path){
  /**
  e.g.
    ohas({x: {y:123}}, 'x.y')
    ohas({x: {y:123}}, 'x.y.z.w')
    ohas({x: {y:123}}, 'a')
    ohas({x: {y:123, z:{foo: 'test'}}}, 'x.z.foo')
  */
  const ns = path.split('.')
  let o = obj
  for(const n of ns) {
    if(!isobj(o) || !(n in o))
      return false
    o = o[n]
  }
  return true
}


///
window.__DEBUG = new Proxy({} ,{
  /// deny duplication of setting to same property name
  get(target,prop){ return target[prop] },
  set(target,prop,value){
    if(prop in target)
      // throw new Error('__DEBUG object Error: the property already set: '+prop)
      console.warn('__DEBUG object Error: the property already set: '+prop)
    target[prop] = value
    return true
  }
})

__DEBUG._logStack = []
__DEBUG.log = (...args) => __DEBUG._logStack.push([new Date().toLocaleString(), ...args])
__DEBUG.showlog = (a=10,b=NaN) => __DEBUG._logStack.concat().reverse().slice(...(isNaN(b) ? [0,a] : [a,b]))
// __DEBUG.print = (a=10,b=NaN) => __DEBUG.showlog(a,b).forEach(a=>console.log(...a))
__DEBUG.print = (...args) => __DEBUG.showlog(...args).forEach(a=>console.log(...['%c'+a[0], 'color: #ccc;', ...a.slice(1)]))
window.p = (...args) => {__DEBUG.print(...args); console.log('%c-- end of log --', 'color: #ccc;'); return ''}


///
__DEBUG.showImportExportLocalStorageUI = function(){
  console.log('__saveLocalStorage')
  const blob = new Blob([ JSON.stringify(localStorage, null, 2) ], { 'type' : 'text/plain' })
  const url = URL.createObjectURL(blob)
  const cn_container = 'showImportExportLocalStorageUI-export'

  ///
  Array.from(document.querySelectorAll('.'+cn_container)).forEach(e=>e.remove())

  ///
  const container = html(`
    <div class="${cn_container}" style="
            background: #f5f7f8;
            position: fixed;
            bottom: 20px;
            padding: 16px;
            ">
            <div>Import/Export entire LocalStorage</div>
            </div>
    `)
  const export_a = html(`
    <a href="${url}"
       download="storage.json"
       style="display:none;"
       >exportLocalStorage</a>
    `)
  const export_button = html(`
    <button>export</button>
    `)

  const import_input = html(`<label style="display:none;"><input type="file" accept=".json">import</label>`)
  const import_button = html(`<button>import</button>`)

  container.append(export_a)
  container.append(export_button)
  container.append(html(`<br>`))
  container.append(import_input)
  container.append(import_button)
  document.body.append(container)

  import_input.addEventListener('change', e=>{
    const inp = e.target
    const reader = new FileReader()
    reader.onload = ()=>{
      const text = reader.result
      const o = JSON.parse(text)
      console.log('window.__json', o)
      window.__json = o

      ///
      for(const n in localStorage)
        delete localStorage[n]
      for(const n in o)
        localStorage[n] = o[n]
    }
    reader.readAsText(inp.files[0])
  })

  export_button.addEventListener('click', e=>{
    // const extensionId = location.hostname
    const extensionId = chrome.runtime.id
    const filename = `shinkai_localstorage_${extensionId}_${Date.now()}.json`
    export_a.download = filename
    export_a.click()
  })
  import_button.addEventListener('click', e=>{
    import_input.click()
  })
}


