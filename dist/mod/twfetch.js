'use strict'

/// import jsSHA from '../lib/sha1.min.js'

void (()=>{

function hmac_sha1(string, secret) {
    const shaObj = new jsSHA('SHA-1', 'TEXT')
    shaObj.setHMACKey(secret, 'TEXT')
    shaObj.update(string)
    const hmac = shaObj.getHMAC('B64')
    return hmac
}

function genSortedParamStr(params, key, token, timestamp, nonce)  {
    const paramObj = {
        oauth_consumer_key : key,
        oauth_nonce : nonce,
        oauth_signature_method : 'HMAC-SHA1',
        oauth_timestamp : timestamp,
        oauth_token : token,
        oauth_version : '1.0',
        ...params
    }
    const paramObjKeys = Object.keys(paramObj)
    const len = paramObjKeys.length
    paramObjKeys.sort()
    return paramObjKeys.map(n=>`${n}=${percentEncode(decodeURIComponent(paramObj[n]))}`).join('&')
}
function percentEncode(str) {
  return encodeURIComponent(str).replace(/[!*()']/g, (character) => {
    return '%' + character.charCodeAt(0).toString(16)
  })
}

function getAuthorization(keys, httpMethod, baseUrl, reqParams) {
    const {consumerKey,consumerSecret,accessToken,accessTokenSecret} = keys

    const timestamp  = Math.round(Date.now() / 1000)
    const nonce      = Math.random().toFixed(5)+timestamp
    const baseString = httpMethod
                + '&' + percentEncode(baseUrl)
                + '&' + percentEncode(genSortedParamStr(reqParams, consumerKey, accessToken, timestamp, nonce))
    const signingKey = consumerSecret+'&'+accessTokenSecret
    const signature  = percentEncode(hmac_sha1(baseString, signingKey))

    return `OAuth
        oauth_consumer_key="${consumerKey}",
        oauth_nonce="${nonce}",
        oauth_signature="${signature}",
        oauth_signature_method="HMAC-SHA1",
        oauth_timestamp="${timestamp}",
        oauth_token="${accessToken}",
        oauth_version="1.0"
        `.split(/\n+/g).map(s=>s.trim()).join(' ')
}


function _twFetch(keys, baseurl, params, method='GET'){
    /// keys : Object { consumerKey, consumerSecret, accessToken, accessTokenSecret }

    return fetch(`${baseurl}?${Object.entries(params).map(([n,v])=>`${n}=${v}`).join("&")}`, {
        method: method,
        headers:{
            'Authorization': getAuthorization(keys, method, baseurl, params ),
        },
    })
}

function twFetch(jsonObj, keys, callback=()=>{}, onError=e=>console.error('twFetch error:', e)){
  const {baseUrl, params, method} = jsonObj
  return _twFetch(keys, baseUrl, params, method)
  .then(e=>e.text())
  .then(e=>callback(e))
  .catch(onError)
}


window.twFetch = twFetch
})()


