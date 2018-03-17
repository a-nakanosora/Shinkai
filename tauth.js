'use strict'
void async function(){
  function assert(b,msg){if(!b) throw new Error(msg ? 'Assertion Error: '+msg : 'Assertion Error.') }
  function redirect(url){location.href = url }
  function sleep(interval){return new Promise(ok=>setInterval(ok, interval)) }
  const lag = ()=>sleep(1)

  await lag() ///

  const toppage = GlobalPref.toppage

  const q = location.search
  if(q.match(/oauth_token=([^&]+)/) && q.match(/oauth_verifier=([^&]+)/)){
    /// redirected from twitter auth
    if(q.match(/denied=/))
      return redirect(toppage)

    const [_1, a] = q.match(/oauth_token=([^&]+)/)
    const [_2, b] = q.match(/oauth_verifier=([^&]+)/)

    const [t,s] = Session.getRequestTokenKeys()
    assert(t&&s)
    assert(t===a)
    TwApi.prepare()
    TwApi.setKeys({accessToken:t, accessTokenSecret:s})
    const e = await TwApi.getAccessToken({oauth_verifier: b})
    assert(e.match(/oauth_token=([^&]+)/), e)
    assert(e.match(/oauth_token_secret=([^&]+)/), e)
    const [_3, accessToken] = e.match(/oauth_token=([^&]+)/)
    const [_4, accessTokenSecret] = e.match(/oauth_token_secret=([^&]+)/)
    Session.setAccessTokens(accessToken, accessTokenSecret)

    redirect(toppage)
  } else {
    redirect(toppage)
  }
}()


