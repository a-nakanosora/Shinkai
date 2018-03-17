void function(){

const mapEachSealed = obj => {
  const o = {}
  for(const n in obj)
    o[n] = Object.seal(obj[n])
  return o
}

const Storage = {
  ///
  nameUserData(user){
    assert(user && user.datatype==='user' && user.screen_name)
    return `Shinkai_CachedUsers_${user.screen_name}`
  },
  loadUserData(app){
    const n = this.nameUserData(app.myself)
    const users = mapEachSealed(this._load(n) || {...this._userDataDefault})
    assert( Object.entries(users).every(([uid,u])=> u.datatype==='user' && u.userId===uid && Object.isSealed(u) ) )
    return users
  },
  saveUserData(app){
    const n = this.nameUserData(app.myself)
    const data = {...app.users}
    assert( Object.entries(data).every(([uid, u])=> u.datatype==='user' && uid===u.userId && Object.isSealed(u) ) )
    return this._save(n, data)
  },
  _userDataDefault: Object.freeze({}),

  ///
  nameCustomMapData(user){
    assert(user && user.datatype==='user' && user.screen_name)
    return `Shinkai_CustomMap_${user.screen_name}`
  },
  loadCustomMapData(app){
    const n = this.nameCustomMapData(app.myself)
    return this._load(n) || {...this._customMapDataDefault}
  },
  saveCustomMapData(app){
    const n = this.nameCustomMapData(app.myself)
    const data = {...app.userTransformsCustomMap}
    this._save(n, data)
  },
  _customMapDataDefault: Object.freeze({}),


  ///
  getPacked(app){
    assert(app.myself)
    assert(app.myself.name)
    assert(app.myself.screen_name)
    const {userId, name, screen_name} = app
    return {
      myself: {userId, name, screen_name},
      [this.nameUserData(app.myself)]: this.loadUserData(app),
      [this.nameCustomMapData(app.myself)]: this.loadCustomMapData(app),
    }
  },

  ///
  _load(name){
    return localStorage[name]
             ? JSON.parse(localStorage[name])
             : null
  },
  _save(name, value){
    localStorage[name] = JSON.stringify(value)
  },
}

const TwData = {
  tltweet(tweetRaw, {userId, userScreenName, userProfileImageUrl=''}){
    assert(typeof userId === 'string')
    const bodyText0 = tweetRaw.full_text || tweetRaw.text || '' /// <!> full_text -- when `tweet_mode:'extended'`
    const bodyText = bodyText0.replace(/^RT\s*\@[^:]+\:\s*/, '')
    return Object.seal({
        datatype: 'tltweet',
        tweetId: tweetRaw.id_str,
        bodyText,
        ...osel(tweetRaw, `
            created_at,
            entities: { urls[] },
            extended_entities: {
              media[]: { expanded_url, media_url }
            },
            retweeted_status: {
              extended_entities: {
                media[]: { expanded_url, media_url }
              },
              user: {profile_image_url, name, screen_name},
            },
            `),
        userId, userScreenName, userProfileImageUrl,
      })
  },
  popuptweet(tweetRaw){
    return Object.seal({
        datatype: 'popuptweet',
        tweetId: tweetRaw.id_str,
        bodyText: tweetRaw.full_text || tweetRaw.text || '', /// <!> full_text -- when `tweet_mode:'extended'`
        hot: false,
        ...osel(tweetRaw, `
            extended_entities: {
              media[]: { expanded_url, media_url }
            },
            retweeted_status: {
              extended_entities: {
                media[]: { expanded_url, media_url }
              },
              user: {profile_image_url, name, screen_name},
            },
            `),
      })
  },
  user(userRaw){
    assert(userRaw.id_str)
    return Object.seal({
      datatype: 'user',
      userId: userRaw.id_str,
      ...osel(userRaw,`
        profile_image_url, profile_link_color, profile_banner_url,
        description, screen_name, name, friends_count,
        `),

      last_tweet_id: null,
      date_last_checked: null,
      date_last_updated: null,
      date_last_tweeted: null,
      tweet_updated: null,
      tweet_update_state: null,
    })
  },
}


window.Storage = Storage
window.TwData = TwData

}()
