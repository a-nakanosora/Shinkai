'use strict'

const Session = {
  loadAccessTokens(){
    return [sessionStorage.at || '', sessionStorage.ats || '']
  },
  setAccessTokens(accessToken, accessTokenSecret){
    if(!(accessToken && accessTokenSecret))
      throw new Error(`setAccessTokens Error: invalid args: ${accessToken} / ${accessTokenSecret}`)
    sessionStorage.at = accessToken
    sessionStorage.ats = accessTokenSecret
  },

  getRequestTokenKeys(){
    return [sessionStorage.t, sessionStorage.s]
  },

  async signin(authcallback){
    /**
    sessionStorage.t
    sessionStorage.s
    sessionStorage.at
    sessionStorage.ats
    */
    TwApi.prepare()
    const e = await TwApi.requestToken({oauth_callback: encodeURIComponent(authcallback)})
    const [_1, t] = e.match(/oauth_token=([^&]+)/)
    const [_2, s] = e.match(/oauth_token_secret=([^&]+)/)
    sessionStorage.t = t
    sessionStorage.s = s

    redirect('https://api.twitter.com/oauth/authenticate?oauth_token='+t)
  },
}