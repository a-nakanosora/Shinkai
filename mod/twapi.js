'use strict'

const TwApi = {
  _handleResponse: (ok, ng) => (e=>{
    try{
      var o = JSON.parse(e)
    }catch(e){
      return ng({errorType:'JSON_PARSE_ERROR', message:'JSON.parse error: '+e})
    }
    if(o.err) /// Shinkai error
      return ng({errorType:'SHINKAI_ERROR', ...o})
    if(o.errors) /// TWITTER_API_ERROR
      return ng({errorType:'TWITTER_API_ERROR', ...o})
    ok(o)
  }),

  _handleFetchError: ng=>{
    return e=>{
      ng({
        errorType: e instanceof TypeError ? 'FETCH_ERROR' : 'FETCH_UNKNOWN_ERROR',
        message: e.message,
        stack: e.stack,
      })
    }
  },

  _keys: {
    consumerKey:'',
    consumerSecret:'',
    accessToken:'',
    accessTokenSecret:'',
  },

  setKeys(keys){
    this._keys = {...this._keys, ...keys}
  },

  prepare(){
    if(localStorage.shinkaiopt){
      const {ck, cks} = JSON.parse(localStorage.shinkaiopt)
      this.setKeys({
        consumerKey: ck,
        consumerSecret: cks,
      })
    }
  },
  isConsumerKeysSet(){
    return this._keys.consumerKey && this._keys.consumerSecret
  },

  tryCallApi: ()=> new Promise((ok,ng)=>{
    /// check the cunsumer keys are valid
    const {consumerKey, consumerSecret} = TwApi._keys
    const keys = {consumerKey, consumerSecret, accessToken:'', accessTokenSecret:''}
    twFetch({
      baseUrl: 'https://api.twitter.com/oauth/request_token',
      params: {oauth_callback:''},
      mathod: 'POST',
    }, keys, e=>{
      if(e.includes('Could not authenticate you.'))
        ng({errorType:'TRI_CALL_API_ERROR', message:'tryCallApi Error', e:e})
      ok({message:'ok'})
    }, err=>{
      ng({errorType:'TRI_CALL_API_ERROR', message:'tryCallApi Error', e:err})
    })
  }),


  getAccessToken: ({oauth_verifier}) => new Promise((ok,ng)=>{
    twFetch2({
      baseUrl: 'https://api.twitter.com/oauth/access_token',
      params: {
        oauth_verifier,
      },
      mathod: 'POST',
    // }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
    }, e=>ok(e), TwApi._handleFetchError(ng))
  }),

  requestToken: ({oauth_callback}) => new Promise((ok,ng)=>{
    twFetch2({
      baseUrl: 'https://api.twitter.com/oauth/request_token',
      params: {
        // oauth_callback: encodeURIComponent(oauth_callback),
        oauth_callback,
      },
      mathod: 'POST',
    // }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
    }, e=>ok(e), TwApi._handleFetchError(ng))
  }),

  getFriendsIds: ({screen_name, user_id, cursor=null}) => new Promise((ok,ng)=>{
    assert(screen_name || user_id)
    assertMaybeString(user_id)
    assert(cursor===null || typeof cursor==='number')

    const params = {
      ...(user_id ? {user_id} : {screen_name}),
      ...(cursor===null ? {} : {cursor}),
      stringify_ids:true, /// test -- to avoid "not found" error on getting users by id(number)
    }

    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/friends/ids.json',
      params,
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),


  /// e.g. TwApi.getFriendsList({screen_name: "abc21196433", count:10, skip_status:true, include_user_entities:false}).then(e=>console.log(e, JSON.stringify(e).length))
  getFriendsList: ({screen_name, user_id, cursor=null, count=null, skip_status=null, include_user_entities=null}) => new Promise((ok,ng)=>{
    assert(screen_name || user_id)
    assertMaybeString(user_id)

    const params = {
      ...(user_id ? {user_id} : {screen_name}),
      ...(cursor!==null ? {cursor} : {}),
      ...(count!==null ? {count} : {}),
      ...(skip_status!==null ? {skip_status} : {}),
      ...(include_user_entities!==null ? {include_user_entities} : {}),
    }

    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/friends/list.json',
      params,
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),

  getUserTimeline: ({
    screen_name, user_id,
    count=null, since_id=null, max_id=null,
    trim_user=null, exclude_replies=null, include_rts=null,
    // tweet_mode=null,
    tweet_mode='extended', /// for to always get `extended_entities` correctly
   }) => new Promise((ok,ng)=>{
    assert(screen_name || user_id)
    assertMaybeString(user_id)
    assertMaybeString(since_id)
    assertMaybeString(max_id)

    const params = {
      ...(user_id ? {user_id} : {screen_name}),
      ...(count!==null ? {count} : {}),
      ...(since_id!==null ? {since_id} : {}),
      ...(max_id!==null ? {max_id} : {}),
      ...(trim_user!==null ? {trim_user} : {}),
      ...(exclude_replies!==null ? {exclude_replies} : {}),
      ...(include_rts!==null ? {include_rts} : {}),
      ...(tweet_mode!==null ? {tweet_mode} : {}),
    }

    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/statuses/user_timeline.json',
      params,
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),


  getHomeTimeline: ({
    count=null, since_id=null, max_id=null,
    trim_user=null, exclude_replies=null, include_entities=null,
    tweet_mode='extended', /// for to always get `extended_entities` correctly
   }) => new Promise((ok,ng)=>{
    assertMaybeString(since_id)
    assertMaybeString(max_id)

    const params = {
      ...(count!==null ? {count} : {}),
      ...(since_id!==null ? {since_id} : {}),
      ...(max_id!==null ? {max_id} : {}),
      ...(trim_user!==null ? {trim_user} : {}),
      ...(exclude_replies!==null ? {exclude_replies} : {}),
      ...(include_entities!==null ? {include_entities} : {}),
      ...(tweet_mode!==null ? {tweet_mode} : {}),
    }

    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/statuses/home_timeline.json',
      params,
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),

  getMyName: () => new Promise((ok,ng)=>{
    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/account/settings.json',
      params: {},
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),


  getUserInfo: ({screen_name, user_id}) => new Promise((ok,ng)=>{
    assert(screen_name || user_id)
    assertMaybeString(user_id)

    const params = {
      ...(user_id ? {user_id} : {screen_name}),
    }

    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/users/show.json',
      params,
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),

  getRateLimitStatus: ({resources=null}={}) => new Promise((ok,ng)=>{
    assert(resources === null || typeof resources==='string')
    /// e.g. resources =~ 'help,users,search,statuses'
    const params = resources ? {resources} : {}
    twFetch2({
      baseUrl: 'https://api.twitter.com/1.1/application/rate_limit_status.json',
      params,
      mathod: 'GET',
    }, TwApi._handleResponse(ok,ng), TwApi._handleFetchError(ng))
  }),

}

function assertMaybeString(v){
  assert(v === undefined || v === null || typeof v === 'string')
}

function twFetch2(jsonObj, callback, onError){ /// wrapper
  twFetch2._count = (twFetch2._count||0)+1 /// debug
  return twFetch(jsonObj, TwApi._keys, callback, onError)
}

const TwitterErrorCode = {
  USER_NOT_FOUND: 50, /// "User not found."
  RATE_LIMIT_EXCEEDED: 88, /// "Rate limit exceeded"
  PAGE_DOES_NOT_EXIST: 34, /// "Sorry, that page does not exist."
  CREDENTIALS_DONT_ALLOW_ACCESS: 220, /// "Your credentials do not allow access to this resource"
}



async function handleFetchError(f, onError=()=>{}){
  try {
    await f()
    return null
  } catch(e) {
    if(e.errorType === 'FETCH_ERROR' || e.errorType === 'FETCH_UNKNOWN_ERROR') {
      onError(e)
      return e
    } else
      throw e
  }
}

async function handleTwError(f, codes, onError=()=>{}){
  if(!(codes instanceof Array))
    codes = [codes]
  assert(codes.every(v=>Object.values(TwitterErrorCode).includes(v))
        , `handleTwError: invalid codes given: ${codes}`)

  try {
    await f()
    return null
  } catch(e) {
    if(e.errorType!=='TWITTER_API_ERROR')
      throw e

    if(e.errors.length !== 1) {
      const e2 = new Error('handleTwError: unsupported error: length !== 1')
      e2.target = e
      throw e2
    }

    const err = e.errors[0]
    assert(err.code && err.message, `handleTwError: Unexpected Error: ${err.code} / ${err.message}`)
    if(codes.includes(err.code)) {
      err.handled = true
      err.errorType = e.errorType
      onError(err)
      return err
    }

    throw e
  }
}

async function handleTwErrorAll(f, onError=()=>{}){
  try {
    await f()
    return null
  } catch(e) {
    if(e.errorType!=='TWITTER_API_ERROR')
      throw e

    if(e.errors.length !== 1) {
      const e2 = new Error('handleTwErrorAll: unsupported error: length !== 1')
      e2.target = e
      throw e2
    }

    const err = e.errors[0]
    assert(err.code && err.message)
    err.handled = true
    err.errorType = e.errorType
    onError(err)
    return err
  }
}


async function handleTwError2(f, codes, onError=()=>{}){
  let err = null
  const e2 = await handleFetchError(async _=>{
    const e = await handleTwError(f, codes, ()=>{})
    if(e)
      err = e
  }, ()=>{})
  if(e2)
    err = e2

  if(err){
    err.handled = true
    assert(err.errorType)
    onError(err)
    return err
  }
  return null
}
async function handleTwErrorAll2(f, onError=()=>{}){
  let err = null
  const e2 = await handleFetchError(async _=>{
    const e = await handleTwErrorAll(f, ()=>{})
    if(e)
      err = e
  }, ()=>{})
  if(e2)
    err = e2

  if(err){
    err.handled = true
    assert(err.errorType)
    onError(err)
    return err
  }
  return null
}

async function handleRateLimit(f, {waitLimit=20, waitInterval=1*60*1000}={}){
  /// waitInterval : [ms]
  let waitCount = 0
  while(waitCount < waitLimit) {
    try {
      await f()
      return
    } catch(e) {
      if(e.errorType==='TWITTER_API_ERROR' && e.errors[0].code === TwitterErrorCode.RATE_LIMIT_EXCEEDED){
        console.log('reached API rate limit. please wait...', waitCount)
        await sleep(waitInterval)
        waitCount++
      } else
        throw e
    }
  }
  throw new Error('handleRateLimit Error: timeout.')
}


