'use strict'


function incrementStrId(id_str, digit=0){
  /**
  incrementStrId('1234', 0) => '1235'
  incrementStrId('1234', 1) => '1244'
  incrementStrId('1999', 1) => '2009'
  incrementStrId('9999', 1) => '10000'
  incrementStrId('999999999999999999999999999999', 0) => '1000000000000000000000000000000'
  */
  assert(typeof id_str === 'string')
  assert(id_str.split('').every(c=>!isNaN(c)))
  assert(id_str[0]!=='0')
  assert(typeof digit === 'number' && 0<=digit)
  const l = id_str.length
  if(digit === l)
    return '1'+id_str
  else if(digit > l)
    throw new Error(`incrementStrId error: invalid digit: ${digit} / ${id_str}`)

  const b=id_str
  const i=digit
  const c = Number( b.slice(l-1-i,l-i) )
  if(c<9)
    return b.slice(0, l-1-i) + String(c+1) + (-i<=-1 ? b.slice(-i) : '')
  else
    return incrementStrId(b.slice(0, l-1-i) + String(0) + (-i<=-1 ? b.slice(-i) : ''), digit+1)
}
function decrementStrId(id_str, digit=0){
  assert(typeof id_str === 'string')
  assert(id_str.split('').every(c=>!isNaN(c)))
  assert(id_str[0]!=='0')
  assert(typeof digit === 'number' && 0<=digit)
  const l = id_str.length
  if(digit === l)
    return '1'+id_str
  else if(digit > l)
    throw new Error(`decrementStrId error: invalid digit: ${digit} / ${id_str}`)

  const b=id_str
  const i=digit
  const c = Number( b.slice(l-1-i,l-i) )
  if(c>0)
    return (b.slice(0, l-1-i) + String(c-1) + (-i<=-1 ? b.slice(-i) : '')).replace(/^0+/, '')
  else
    return (decrementStrId(b.slice(0, l-1-i) + String(9) + (-i<=-1 ? b.slice(-i) : ''), digit+1)).replace(/^0+/, '')
}


function lerpHexColor(colorA, colorB, t){
  /// e.g. lerpHexColor('789abc', 'ffffff', .7)
  assert(typeof colorA === 'string')
  assert(typeof colorB === 'string')
  if(!colorA.match(/^[\dA-F]{6}$/i) || !colorB.match(/^[\dA-F]{6}$/i)) {
    console.warn(`lerpHexColor warning: color format unmatch: ${colorA} / ${colorB}`)
    return ''
  }
  const cA = colorA.match(/^([\dA-F]{2})([\dA-F]{2})([\dA-F]{2})$/i).slice(1).map(s=>parseInt(s, 16))
  const cB = colorB.match(/^([\dA-F]{2})([\dA-F]{2})([\dA-F]{2})$/i).slice(1).map(s=>parseInt(s, 16))
  assert( cA.every(x=>!isNaN(x)) )
  assert( cB.every(x=>!isNaN(x)) )

  const lerp = (a,b,t)=>a+(b-a)*t
  const [r,g,b] = Array.from(zip(cA,cB)).map(([a,b])=>Math.round(lerp(a, b, t)))
  return [r,g,b].map(x=> x.toString(16).padStart(2,"0")).join('')
}


function isVisibleTweetInHome(tw, users){
  /// omit outside-mention -- emurate clawlHome's result
  return !isMention(tw) || isRetweet(tw) || isVisibleMention(tw, users)
}
function isRetweet(tweet){
  // return tweet.text.startsWith('RT @')
  return !!tweet.retweeted_status
}
function isMention(tweet){
  return tweet.entities.user_mentions && tweet.entities.user_mentions.length && !isRetweet(tweet)
}
function isVisibleMention(tweet, users){
  return isMention(tweet) && tweet.entities.user_mentions.some(u=> users[u.id_str])
}
function cannotViewUserTimeline(resp){
  /**
  resp := TwApi.getUserTimeline()
  when the user is protected(locked) account:
    resp : Object {
      error: "Not authorized.",
      request: "/1.1/statuses/user_timeline.json",
    }
  <!> not Twitter Error
  */
  return !(resp instanceof Array) && resp.error === 'Not authorized.'
}

