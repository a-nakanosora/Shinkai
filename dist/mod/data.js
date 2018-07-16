void function(){

const mapEachSealed = obj => {
  const o = {}
  for(const n in obj)
    o[n] = Object.seal(obj[n])
  return o
}

const Storage = {
  ///
  nameEntireData(app){
    assert(app.myself && app.myself.screen_name)
    return `Shinkai_UserData_${app.myself.screen_name}`
  },
  loadEntireData(app){
    const n = this.nameEntireData(app)
    const data = this._load(n)
    if(data) {
      ImportExport.setUserData(app, data)
    }
  },
  saveEntireData(app){
    const n = this.nameEntireData(app)
    const data = ImportExport.getUserData(app)
    this._save(n, data)
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

const ImportExport = {
  versionUserData: '1.1',
  getUserData(app){
    assert(app.myself)
    const data = {
      shinkaiUserDataVer: ImportExport.versionUserData,
      myself: osel(app.myself, `userId, screen_name, name`),
      users: clone(app.users),
      customMap: clone(app.userTransformsCustomMap || {}),
      pastPopupTweets: clone(app.pastPopupTweets || {}),
    }
    checkDataStructure(data)
    return data
  },
  setUserData(app, data0){
    assert(app.myself)
    const data = migrate(data0)
    const {shinkaiUserDataVer, myself, users, customMap, pastPopupTweets} = data

    if( shinkaiUserDataVer !== ImportExport.versionUserData)
      throw new Error('ImportExport.setUserData Error: invalid data: incorrect data version.')

    if(myself.userId !== app.myself.userId
       || !Object.entries(users).every(([userId, u])=>userId===u.userId)
       )
      throw new Error('ImportExport.setUserData Error: invalid data.')


    const userDataDefault = TwData.user({id_str:'0'})
    const users2 = mapEachSealed( omap(users, u=>({...userDataDefault, ...u})) ) /// through default data for Object.seal()
    assert( Object.entries(users2).every(([uid,u])=> u.datatype==='user' && u.userId===uid && Object.isSealed(u) ) )

    app.users = users2
    app.userTransformsCustomMap = clone(customMap)
    app.pastPopupTweets = clone(pastPopupTweets)
  },
}

function migrate(data){
  __DEBUG.log('migrate', data)
  assert(data.shinkaiUserDataVer)
  checkDataStructure(data)

  if(data.shinkaiUserDataVer === '1') {
    __DEBUG.log('migrate data 1 -> 1.1')
    const data2 = {
      ...data,
      pastPopupTweets: {},
      shinkaiUserDataVer: '1.1',
    }
    return migrate(data2)

  } else if(data.shinkaiUserDataVer === '1.1') {
    return data
  }

  throw new Error('migrate error')
}

function checkDataStructure(data){
  if(data.shinkaiUserDataVer === '1') {
    assert(data.myself)
    assert(data.users)
    assert(data.customMap)

  } else if(data.shinkaiUserDataVer === '1.1') {
    assert(data.myself)
    assert(data.users)
    assert(data.customMap)
    assert(data.pastPopupTweets)

  } else
    throw new Error('checkDataStructure error')
}

const TwData = {
  tltweetnouser(tweetRaw){
    return TwData.tltweet(tweetRaw, {userId:'0', userScreenName:'tltweetnouser'})
  },
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
        date: new Date(tweetRaw.created_at).getTime(),
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
        latestTweets: null, /// List of Object<TwData.tweetdate> | null
      })
  },

  tweetdate(tweetRaw){
    return Object.seal({
        datatype: 'tweetdate',
        date: new Date(tweetRaw.created_at).getTime(),
        tweetId: tweetRaw.id_str,
      })
  },
}


window.Storage = Storage
window.ImportExport = ImportExport
window.TwData = TwData

}()
