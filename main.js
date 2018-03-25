'use strict'
const Version = {version: 'alpha20180326'}
const Pref = {
  parallelConnection: 10,
  clawlEachUserMaxProcess: 100,
  refreshUserMaxProcess: 500,
  boundedTimelineMaxUsers: 200,
  generateTimelineBlockSize: 10,

  sortingShape: 'spiral',
  // sortingShape: 'wave',
  spiralCoef: {radius:32, h:2.0, offset:.7},
  waveCoef: {n:13, kx:950, ky:400, k:4, offset:.2, viewOffset:.5},

  /// auto clawl
  autoClawlInterval: 11*60*1000,
  autoClawlHomeInterval: 1*60*1000,

  /// clawlBlahBlah
  minIntervalClawlHome: 30*1000,
  minIntervalClawlEachUser: 9*60*1000,




  /// show all clawl at first whether or not users[].last_tweet_id is set
  // alwaysShowAllClawlTlAtFirst: true,
  alwaysShowAllClawlTlAtFirst: false,

  /// show all clawl-home at first whether or not users[].last_tweet_id is set
  alwaysShowAllClawlHomeTlAtFirst: true,
  // alwaysShowAllClawlHomeTlAtFirst: false,

  ///
  autoLoadAtFirst: true,
  // autoLoadAtFirst: false,

  ///
  autoRefreshFriendsUsers: true,

  ///
  enableClawlOnLoadDone: false,
  // enableClawlOnLoadDone: true,

  ///
  excludeRepliesOnClawl: true,


  ///
  zoomOnMouse: true,

  ///
  // useSailMove: false,
  useSailMove: true,
  sailmoveCoef: .2,
  dragThres: 5,

  ///
  stopProfileGifAnimation: true,

  ///
  uiShowInsideMethod: false,

  ///
  useTimelineViewAutoExtend: true,

  ///
  showExperimentalFeatures: false,
}


///
const app = new Vue({
  el: '#vueroot',
  data: {
    version: '',
    initializeDone:false,
    myself: null,
    pseudoMyself: null,

    users: {},
    /**
    users : Object {
      [userId]: Object<TwData.user()> {...},
      ...
    }
    */

    tl: [],
    /**
    tl : List of Object<TwData.tltweet()> {...}
    */

    tlUserProfile: {
      tlType: 'none',
    },
    tlRawHome: [],
    tlRaw: [],
    cursorTl: 0,

    popuptweets: {},
    /**
    popuptweets : Object {
      [userId]: Object<TwData.popuptweet()> {...},
      ...
    }
    */

    activeUid: '',
    usersLoaded: false,
    isProcessing: false,
    isProcessing_loadTimelineNextPage: false,
    homeLastTweetId: null,
    enabledAutoClawlEachUser: false,
    enabledAutoClawlHome: false,
    firstClawlEachUser: true,
    firstClawlHome: true,
    dateLastClawlHome: 0,
    dateLastClawlEachUser: 0,

    consumerKey: '',
    consumerSecret: '',
    accessToken: '',
    accessTokenSecret: '',

    transfOrigin: '0px 0px',
    transX:0,
    transY:0,
    transScale: 1.0,
    userTransforms: {},
    userTransformsCustomMap: {},
    usersSortedOrder: {},
    noCustomTransformUsers: null,
    popuptweetThumbnails: {},
    _genThumbRequests:[],
    _viewNavigationCanceled: false,
    useSailMove: true,
    sortingShape: '',
    usermapSortingMode: 'new',
    usermapVisibleUsers: {},

    /// UI View
    status: '',
    statusDissolve_: '',
    _statusDissolveTimerId: -1,
    twitterApiErrorMessage: '',
    generalErrorMessages: [],
    showSelfInfo: true,
    tlviewfolded: true,
    showInsideMethod: false,
    showSubmenu: false,
    showWarningKeysNotSet: false,
    showExperimentalFeatures: false,
  },
  computed: {
    statusDissolve: {
      get(){return this.statusDissolve_},
      set(v) {
        const delay = 5*1000
        if(this._statusDissolveTimerId > -1)
          clearInterval(this._statusDissolveTimerId)
        this.statusDissolve_ = v
        this._statusDissolveTimerId = setInterval(_=>{this.statusDissolve_ = ''}, delay)
      }
    },
    clawled(){return !this.firstClawlEachUser || !this.firstClawlHome},
    usersCount(){return Object.keys(this.users).length},
  },
  async mounted(){
    this.someFixes()

    this.applyPrefOverrides()
    this.applyPrefToApp()
    this.resetView()
    this.activateAutoClawl()
    this.activateThumbnailGenerator()

    this.initTokens()
    await this.prepareTwApi()

    await handleTwErrorAll(async _=>{
      await this.initSelfInfo()
    }, err=>{
      console.warn('mounted handled Error:', err)
    })

    this.initializeDone = true

    if(this.myself) {
      if(Pref.autoLoadAtFirst) {
        this.loadDataFromStore()
        if(Pref.autoRefreshFriendsUsers && !this.usersCount)
          await this.refreshFriendsUsers()
        this.cooldownUsers() /// test
        this.sortUsers()
      }

      if(Pref.enableClawlOnLoadDone) {
        await this.switchAutoClawler(true)
      }

      await lag()
    }
  },
  methods: {
    print(...args){ console.log(...args) },
    entries: arr=> Array.from(arr.entries()),
    ovalues: obj=> Object.values(obj),
    reverse: value=> value.slice().reverse(),
    range(begin, end){
      const arr = []
      for (let i=begin; i<end; i++)
        arr.push(i)
      return arr
    },

    someFixes(){
      /// for Firefox - disable image drag action
      document.addEventListener('dragstart', e=> e.preventDefault())
    },

    applyPrefOverrides(){
      /**
      e.g.
      localStorage['Shinkai_PrefOverride'] = JSON.stringify({
          uiShowInsideMethod: true,
        })
      */
      try{
        const overrides = JSON.parse(localStorage['Shinkai_PrefOverride'] || '{}')
        Object.assign(Pref, overrides)
      }catch(e){
        this.generalErrorMessages.push(`applyPrefOverrides Error: ${e.message}`)
        console.warn('applyPrefOverrides Error:', e)
      }
    },
    applyPrefToApp(){
      this.version = Version.version
      this.showInsideMethod = Pref.uiShowInsideMethod
      this.useSailMove = Pref.useSailMove
      this.sortingShape = Pref.sortingShape
      this.showExperimentalFeatures = Pref.showExperimentalFeatures
    },

    resetView(){
      const {x,y,width,height} = this.getUserMapViewRect()
      this.setTransform(Math.round(width/2), Math.round(height/2), 1.0)
    },

    openExtensionOption(e){
      e.preventDefault()
      chrome.runtime.openOptionsPage()
    },

    activateAutoClawl(){
      let ta = -1
      let tb = -1

      setInterval(async _=>{
        if(!this.enabledAutoClawlEachUser){
          ta = -1
        } else {
          if(ta===-1)
            ta = Date.now()

          if(!this.isProcessing && Date.now() - ta > Pref.autoClawlInterval) {
            await this.runClawlerEachUser()
            ta = Date.now()
          }
        }

        if(!this.enabledAutoClawlHome){
          tb = -1
        } else {
          if(tb===-1)
            tb = Date.now()

          if(!this.isProcessing && Date.now() - tb > Pref.autoClawlHomeInterval) {
            await this.runClawlerHomeTL()
            tb = Date.now()
          }
        }
      }, 3*1000)
    },

    activateThumbnailGenerator(){
      this._genThumbRequests = []
      let prevCount = 0
      const tid = setInterval(_=>{
        if(this.activateThumbnailGenerator._shouldUpdate) {
          this.$forceUpdate()
          this.activateThumbnailGenerator._shouldUpdate = false
        }

        const count = this._genThumbRequests.filter(url=> !this.popuptweetThumbnails[url]).length
        if(count === prevCount)
          return
        this.$refs.statusImgGen.textContent = count ? `generating thumbs... (rest: ${count})` : ''
        this.$forceUpdate()
        prevCount = count
      }, 1000)
    },
    makeThumbnail(media_url){
      if(this.popuptweetThumbnails[media_url])
        return
      this._genThumbRequests.push(media_url)
      this.activateThumbnailGenerator._shouldUpdate = true

      /*
      getResizedImage(media_url, url=>{
        this.popuptweetThumbnails[media_url] = url
        this._genThumbRequests = this._genThumbRequests.filter(v=>v!==media_url)
      })
      */
      setTimeout(_=>{
        const thumbUrl = `${media_url}:thumb`
        this.popuptweetThumbnails[media_url] = thumbUrl
        this._genThumbRequests = this._genThumbRequests.filter(v=>v!==media_url)
      }, 10)

    },

    initTokens(){
      const [t,s] = Session.loadAccessTokens()
      this.accessToken = t
      this.accessTokenSecret = s
    },
    async prepareTwApi(){
      TwApi.prepare()
      TwApi.setKeys({accessToken:this.accessToken, accessTokenSecret:this.accessTokenSecret})

      let isValidKeys = false
      try {
        const e = await TwApi.tryCallApi()
        if(e.message==='ok')
          isValidKeys = true
      }catch(e){
        console.error('prepareTwApi: tryCallApi:',e)
      }

      this.showWarningKeysNotSet = !TwApi.isConsumerKeysSet() || !isValidKeys
    },

    loginWithTwitter(){
      Session.signin(GlobalPref.authcallback)
    },

    async initSelfInfo(){
      if(sessionStorage.cachedMyselfData) {
        this.myself = JSON.parse(sessionStorage.cachedMyselfData)
        return await lag()
      }

      const err = await handleTwError2(async _=>{
        const me = await TwApi.getMyName()
        __DEBUG.log('getMyName', me)

        const a = await TwApi.getUserInfo({screen_name:me.screen_name})
        __DEBUG.log('getUserInfo me', a)

        this.myself = TwData.user(a)
        sessionStorage.cachedMyselfData = JSON.stringify(this.myself)
      }, TwitterErrorCode.CREDENTIALS_DONT_ALLOW_ACCESS)
      if(err)
        console.warn('initSelfInfo handled Error:', err)
    },

    validate(){
      /// <!> always use "string id"
      assert(typeof this.homeLastTweetId === 'string' || this.homeLastTweetId === null, 'Validation Error')
      for(const [uid, u] of Object.entries(this.users)) {
        assert(typeof u.userId === 'string', 'Validation Error')
        assert(uid === u.userId, 'Validation Error')
        assert(typeof u.last_tweet_id === 'string' || u.last_tweet_id === null, 'Validation Error')
      }
    },


    async refreshFriendsUsers(){
      assert(this.myself || this.pseudoMyself)
      if(this.pseudoMyself)
        await this._refreshFriendsUsers({user_id: this.pseudoMyself.userId})
      else
        await this._refreshFriendsUsers({user_id: this.myself.userId})
    },
    async _cleanRefreshFriendsUsersRequests(){
      this._cursorRefreshUser = null
      this._requestRefeshUser = []
    },
    async _refreshFriendsUsers({user_id, screen_name}){
      /// get all friends (ids) of a user
      /// & refresh for new followed/removed users
      assert(user_id || screen_name)

      if(this.isProcessing)
        throw new Error('process collision caused.')
      this.isProcessing = true


      this._cursorRefreshUser = this._cursorRefreshUser || null
      this._requestRefeshUser = this._requestRefeshUser || []


      let errored = false

      /// get following users ids
      const specifier = user_id ? {user_id} : {screen_name}
      while(this._cursorRefreshUser !== -1) {
        let res
        const err = await handleTwError2(async _=>{
          res = await TwApi.getFriendsIds({...specifier, cursor: this._cursorRefreshUser})
        }, TwitterErrorCode.RATE_LIMIT_EXCEEDED)

        if(err) {
          errored = true
          if(err.errorType==='TWITTER_API_ERROR') {
            // this.notifyHandledError('getFriendsIds', err)
            console.warn('rate limit exceeded on getFriendsIds. please try again after a few moments.')
            this.generalErrorMessages.push('rate limit exceeded on getFriendsIds. please try again after a few moments.')
          } else if(err.errorType === 'FETCH_ERROR') {
            this.notifyHandledError('getFriendsIds', err)
            console.warn('Povondraite', err)
            // throw err
          } else {
            console.warn('Mundite', err)
            throw err
          }
          break
        }

        const uids = res.ids
        assert(uids.every(v=>typeof v==='string')) /// always use string id

        const cursorNext = res.next_cursor
        __DEBUG.log('_refreshFriendsUsers: getFriendsIds:', res, this._cursorRefreshUser, cursorNext)

        this._requestRefeshUser.push(...uids)
        this._cursorRefreshUser = cursorNext
      }

      if(this._cursorRefreshUser === -1)
        this._cursorRefreshUser = null




      /// get users info by id
      const usersPrev = clone(this.users)
      const usersNext = {}
      if(this._cursorRefreshUser === null) {
        for(const uid of this._requestRefeshUser)
          if(usersPrev[uid] && usersPrev[uid].screen_name)
            usersNext[uid] = usersPrev[uid]
      } else
        Object.assign(usersNext, usersPrev) /// temp

      this._requestRefeshUser = this._requestRefeshUser.filter(uid=>
                                                     !(usersNext[uid] && usersNext[uid].screen_name))
      const uids = clone(this._requestRefeshUser).slice(0, Pref.refreshUserMaxProcess)

      let i=0
      const blocks = eachSlice(uids, Pref.parallelConnection)
      for(const block of blocks) {
        let b
        const err = await handleTwError2(async _=>{
            b = await Promise.all( block.map(uid=> TwApi.getUserInfo({user_id:uid}) ) )
        }, [TwitterErrorCode.USER_NOT_FOUND, TwitterErrorCode.RATE_LIMIT_EXCEEDED])

        if(err) {
          errored = true
          if(err.errorType === 'TWITTER_API_ERROR') {
            if(err.code === TwitterErrorCode.USER_NOT_FOUND)
              console.warn('USER_NOT_FOUND on getUserInfo', block)
            else if(err.code === TwitterErrorCode.RATE_LIMIT_EXCEEDED) {
              console.warn('rate limit exceeded on getUserInfo. please try again after a few moments.')
              this.generalErrorMessages.push('rate limit exceeded on getUserInfo. please try again after a few moments.')
            }
          } else if(err.errorType === 'FETCH_ERROR') {
            this.notifyHandledError('getUserInfo', err)
            console.warn('getUserInfo fetch error:', err)
          } else {
            throw err
          }
          break
        }

        i++
        __DEBUG.log('_refreshFriendsUsers: getUserInfo:', b)
        for(const [uid, userRaw] of zip(block, b)) {
          usersNext[uid] = TwData.user(userRaw)
          assert(uid === usersNext[uid].userId)
          this._requestRefeshUser = arrRemoved(this._requestRefeshUser, uid)

          if(i>5){
            ///
            i=0
            this.users = usersNext
            this.sortUsers()
            // this.$forceUpdate() ///
          }
        }

      }
      this.users = usersNext
      assert(Object.entries(this.users).every(([id, u])=>u.datatype==='user' && id===u.userId))

      if(!errored) {
        this.clearErrorMessages()

        if(this._requestRefeshUser.length)
          this.statusDissolve = 'all users are not loaded yet. try refresh user after a few moment.'
      }

      this.sortUsers()
      this.isProcessing = false

      this.$forceUpdate() ///

      this.saveUsersToStorage()
    },
    refreshUser(uid, twu){
      assert(this.users[uid])
      assert(twu.datatype === 'user')
      assert(twu.userId)
      Object.assign(this.users[uid], osel(twu, `
          name, profile_image_url, screen_name,
          `))
    },
    async beginPseudoMyselfOnActiveUser(){
      if(!this.activeUid)
        return await lag()
      await this.beginPseudoMyself({user_id:this.activeUid})
    },
    async beginPseudoMyself({user_id, screen_name}){
      assert(user_id || screen_name)
      assert(this.myself)
      if(!this.pseudoMyself)
        this._usersOrig = clone(this.users)
      const pm = await TwApi.getUserInfo({user_id, screen_name})
      this.pseudoMyself = TwData.user(pm)
      this._cleanRefreshFriendsUsersRequests()
      await this.refreshFriendsUsers()
    },
    async endPseudoMyself(){
      assert(this.myself)
      assert(this._usersOrig)
      this.pseudoMyself = null
      this.users = this._usersOrig
      this._usersOrig = null
      this._cleanRefreshFriendsUsersRequests()
      this.sortUsers()
    },
    async ui_beginPseudoMyselfOnActiveUser(){
      this.switchAutoClawler(false)
      this.dateLastClawlEachUser = 0
      await this.beginPseudoMyselfOnActiveUser()
    },
    async ui_endPseudoMyself(){
      this.switchAutoClawler(false)
      this.dateLastClawlEachUser = 0
      await this.endPseudoMyself()
    },

    async handleUserIconMouse(user, ev){
      this.activeUid = user.userId

      const p0 = {x: ev.pageX, y: ev.pageY}
      const dragThres = Pref.dragThres
      let dragged = false
      const isDrag = p=> dragged || (dragged = (p0.x-p.x)**2+(p0.y-p.y)**2 >= dragThres**2)
      const throttle = ThrottleTime.create()

      const {x:ux0, y:uy0} = this.userTransforms[user.userId] ? transformStrToNums(this.userTransforms[user.userId]) : {x:0, y:0}
      const userTransformsNext = {...this.userTransforms}
      const [x0, y0, s0] = this.getTransform()

      const elem = ev.target.parentNode.parentNode /// temp
      // elem.style['transition'] = 'transform 200ms linear'
      // elem.style['transition'] = 'transform 50ms linear'
      elem.style['transition'] = 'transform 0ms linear'
      elem.style['will-change'] = 'transform'

      const move = e=>{
        e.preventDefault()
        // if(throttle(1000/30))
        if(throttle(1000/60))
          return
        const p = {x: e.pageX, y: e.pageY}
        if(isDrag(p)){
          /// drag user icon
          this._viewNavigationCanceled = true
          if(ux0 !== null) {
            const dp = {x:p.x-p0.x, y:p.y-p0.y}
            const t = transformStrFromNums({x:ux0 + dp.x/s0, y:uy0 + dp.y/s0})
            // this.userTransforms[user.userId] = t /// <!> bad performance
            userTransformsNext[user.userId] = t
            elem.style['transform'] = `${t} translate(-24px, -24px)`
          }
        }
      }
      const up = e=>{
        e.preventDefault()

        const p = {x: e.pageX, y: e.pageY}
        if(isDrag(p)) {
          /// drag user icon
          this.userTransforms = userTransformsNext
          if(this.usermapSortingMode === 'custom') {
            assert(this.noCustomTransformUsers)
            delete this.noCustomTransformUsers[user.userId]
            const tr = clone(this.userTransformsCustomMap)
            tr[user.userId] = userTransformsNext[user.userId]
            this.userTransformsCustomMap = tr
            this.saveCustomMapToStorage()
          }
        } else {
          /// click user icon
          this.ui_loadUserTimeline(user.userId)
          const u = user
          u.tweet_update_state = ''
          u.tweet_updated = false
          if(this.popuptweets[u.userId])
            this.popuptweets[u.userId].forEach(pt=>pt.hot=false)
        }

        elem.style['transition'] = ''
        elem.style['will-change'] = ''
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },

    handleDropdownMenuFocusOut(e, targetQuery, onFocusOut){
      const root = document.querySelector(targetQuery)
      if(!root)
        return console.warn('handleDropdownMenuFocusOut Warning: target not found:', targetQuery)
      const isChild = elem=>{
        for(let a = elem; a; a = a.parentNode)
          if(a===root)
            return true
        return false
      }
      const f = e=>{
        if(!isChild(e.target)) {
          onFocusOut()
          document.removeEventListener('mousedown', f)
        }
      }
      document.addEventListener('mousedown', f)
    },

    setTlProfile(tlType, profile={}){
      assert(['home', 'user', 'bounded', 'none'].includes(tlType))
      const tlUserProfile = Object.freeze({
        tlType,
        ...osel(profile, `
          bySingleUser,
          userId, name, description,
          profile_link_color, profile_image_url, friends_count,
          userScreenName,
          tlBackColor,
          tlUniqueColor,
          bannerImage,
          `),
      })
      this.tlUserProfile = tlUserProfile
    },
    async ui_loadHomeTimeline({showTlView=true}={}){
      if(this.tlUserProfile.tlType === 'home') {
        this.tlviewfolded = false
        return await lag()
      }

      await this.loadHomeTimeline()
      await this.ui_resetTimelineScroll()
      await this.loadTimelineNextPage(this.tlUserProfile.tlType)
      if(showTlView)
        this.tlviewfolded = false
    },
    async loadHomeTimeline(){
      if(!this.myself)
        return

      if(!this.tlRawHome.length) {
        await this.runClawlerHomeTL()
        if(!this.tlRawHome.length)
          return console.warn('loadHomeTimeline Warning: could not get home timeline.')
      }
      assert(this.tlRawHome.every(tRaw=>!!tRaw.user))


      this.cursorTl = 0
      this.setTlProfile('home', {
        bySingleUser: false,
        ...osel(this.myself, `
          userId, name, description,
          profile_link_color, profile_image_url, friends_count,
          `),
        userScreenName: this.myself.screen_name,
        tlBackColor: lerpHexColor(this.myself.profile_link_color, 'ffffff', .8),
        tlUniqueColor: lerpHexColor(this.myself.profile_link_color, '000000', .5),
        bannerImage: this.myself.profile_banner_url ? `${this.myself.profile_banner_url}/300x100` : '',
      })
    },
    async ui_loadUserTimeline(userId){
      await this.ui_resetTimelineScroll()
      await this.loadUserTimeline(userId)
    },
    async loadUserTimeline(userId){
      this.clearErrorMessages()
      let user
      const err = await handleTwErrorAll2(async _=>{
        user = await TwApi.getUserInfo({user_id:userId})
      })

      if(err){
        this.notifyHandledError('loadUserTimeline', err)
        this.setTlProfile('none')
        this.generateTimelineDisplayEmpty()
      } else {
        const u = TwData.user(user)
        if(this.users[userId])
          this.refreshUser(userId, u)
        const { profile_link_color, profile_banner_url, screen_name} = u
        this.setTlProfile('user', {
          ...osel(u, `
            userId, profile_image_url, profile_link_color, description,
            name, friends_count,
            `),

          profileUrl: `https://mobile.twitter.com/${screen_name}`,
          bannerImage: profile_banner_url ? `${profile_banner_url}/300x100` : '',
          userScreenName:screen_name,
          tlBackColor: lerpHexColor(profile_link_color, 'ffffff', .8),
          tlUniqueColor: lerpHexColor(profile_link_color, '000000', .5),
          bySingleUser: true,
        })
        this.tlRaw = []
        this.tlviewfolded = false

        ///
        // await this.appendTimelineNextPage(u, null)
        await this.loadTimelineNextPage('user')
      }
    },

    async ui_loadBoundedTimeline(){
      await this.ui_resetTimelineScroll()
      await this.loadBoundedTimeline()
    },
    async loadBoundedTimeline(){
      if(this.isProcessing)
        return
      this.isProcessing = true

      const uids = getUsersByBound( this.userTransforms, this.getUserMapViewRect()
                                  , {transX:this.transX, transY: this.transY, transScale: this.transScale}
                                  , 0)

      if(uids.length >= Pref.boundedTimelineMaxUsers) {
        this.statusDissolve = 'too much users.'
        this.isProcessing = false
        return await lag()
      }

      const tlRaw = []
      const uidsBlocks = eachSlice(uids, Pref.parallelConnection)
      for(const block of uidsBlocks) {
        /// todo: error handling
        const b = await Promise.all( block.map(uid=> TwApi.getUserTimeline({user_id:uid, count:20, trim_user:false}) ) )

        for(const [uid, tweets0] of zip(block,b)) {
          const tweets0 = await TwApi.getUserTimeline({user_id:uid, count:20, trim_user:false})
          if(cannotViewUserTimeline(tweets0))
            continue
          __DEBUG.log('loadBoundedTimeline', tweets0)
          const tweets = tweets0.filter(tw=> isVisibleTweetInHome(tw, this.users))
          __DEBUG.log('loadBoundedTimeline2', tweets)
          if(!tweets.length)
            continue
          tlRaw.push(...tweets)
        }
      }
      this.tlRaw = tlRaw

      this.setTlProfile('bounded', {
        bySingleUser: false,
        userId: '123',
        userScreenName:'',
        friends_count:'',
        tlBackColor:'#ECEFF1',
        tlUniqueColor:'#b8bdc3',

        profile_link_color:'#d7dadc',
        profile_image_url:'',
        description:'',
        profileUrl: '', bannerImage: '',
      })
      this.loadTimelineNextPage(this.tlUserProfile.tlType)


      this.tlviewfolded = false
      this.isProcessing = false
    },

    async loadTimelineNextPage(tlType){
      assert(['home', 'user', 'bounded', 'none'].includes(tlType))
      assert(tlType === this.tlUserProfile.tlType)
      if(tlType === 'none')
        return

      const pn = `loadTimelineNextPage#${this.tlUserProfile.userId}`
      if(this.blockProcess(pn))
        return console.warn('loadTimelineNextPage process collision.')

      this.clearErrorMessages()
      const count = Pref.generateTimelineBlockSize
      const begin = 0
      const end = this.cursorTl + count
      let tlRaw = $switch2(tlType, {'home':this.tlRawHome, 'user':this.tlRaw, 'bounded':this.tlRaw})
      if(end > tlRaw.length){
        const tlRaw2 = await this.getTimelineNextPage(tlType)
        if(!tlRaw2) {
          // throw new Error('loadTimelineNextPage: errors inside getTimelineNextPage.')
          console.warn('loadTimelineNextPage Warning: errors inside getTimelineNextPage.')
          this.unblockProcess(pn, {later: 20*1000})
          return
        }

        if(cannotViewUserTimeline(tlRaw2)) {
          this.generateTimelineDisplayCannotView()
          this.unblockProcess(pn, {later: 30*1000})
          return
        }

        tlRaw = $switch2(tlType, {
          'home': _=> this.tlRawHome = this.tlRawHome.concat(tlRaw2),
          'user': _=> this.tlRaw = this.tlRaw.concat(tlRaw2),
          'bounded': _=> this.tlRaw = this.tlRaw.concat(tlRaw2),
        })
      }
      const end2 = Math.min(end, tlRaw.length)
      this.cursorTl = end2
      this.generateTimelineDisplay(tlRaw, begin, end2)
      this.unblockProcess(pn, {later: 1*1000})
    },
    async getTimelineNextPage(tlType){
      assert(['home', 'user', 'bounded'].includes(tlType))
      assert(tlType === this.tlUserProfile.tlType)
      // assert(this.tlUserProfile.tlType === 'home')
      const ref = $switch2(tlType, {'home': this.tlRawHome, 'user': this.tlRaw, 'bounded': this.tlRaw })
      const maxId = ref.length ? TwData.tltweetnouser(arrlast(ref)).tweetId : null
      assert(typeof maxId === 'string' || maxId === null)

      let tweetsRaw0
      const err = await handleTwErrorAll2(async _=>{
        tweetsRaw0 = await $switch2(tlType, {
          'home': async _=> TwApi.getHomeTimeline({
              count:200,
              exclude_replies: false,
              max_id: maxId ? decrementStrId(maxId, 0) : null,
            }),
          'user': async _=> TwApi.getUserTimeline({
              user_id:this.tlUserProfile.userId,
              // count:50,
              count:20,
              trim_user:false,
              max_id: maxId ? decrementStrId(maxId, 0) : null,
            }),
          'bounded': [], /// temp
        })
      })

      if(err) {
        this.notifyHandledError('getTimelineNextPage', err)
        return null
      }
      return tweetsRaw0
    },
    generateTimelineDisplay(tlRaw, begin, end){
      assertype(tlRaw, 'Array')
      assertype(begin, 'Number')
      assertype(end, 'Number')
      assert(tlRaw.every(t=>!!t.user))
      begin = Math.max(begin, 0)
      end = Math.min(end, tlRaw.length)

      const tl = tlRaw.slice(begin, end).map(a=>{
          // const user = {userId:'123', screen_name:'temp'}
          const user = TwData.user(a.user)
          return TwData.tltweet(a, { userId: user.userId
                            , userScreenName: user.screen_name
                            , userProfileImageUrl: user.profile_image_url
                            })
        })
        .sort((a,b)=> new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      this.tl = tl
    },
    generateTimelineDisplayCannotView(){
      this.tl = [{
        created_at: Date.now(),
        text: 'These Tweets are protected.',
        id_str: '',
        ...osel(this.tlUserProfile, `userId, userScreenName`),
      }]
    },
    generateTimelineDisplayEmpty(){
      this.tl = []
    },
    async ui_resetTimelineScroll(){
      this.generateTimelineDisplayEmpty()
      this.$forceUpdate()
      await sleep(100)
    },
    handleTlViewScroll(e){
      if(Pref.useTimelineViewAutoExtend) {
        if(!this.$refs.tlview || !this.$refs.tlreadmore)
          return
        const rect = this.$refs.tlview.getClientRects()[0]
        const rect2 = this.$refs.tlreadmore.getClientRects()[0]

        if( isVisibleRectIn(rect, rect2) )
          this.ui_autoExtendTimeline(e)
      }
    },
    ui_autoExtendTimeline(e){
      this.loadTimelineNextPage(this.tlUserProfile.tlType)
    },

    async switchAutoClawler(enabled){
      this.enabledAutoClawlEachUser = this.enabledAutoClawlHome = enabled
      if(enabled)
        await this.clawlBlahBlah({showMessage:false})
    },

    async clawlBlahBlah({showMessage=true}={}){
      if(Date.now() - this.dateLastClawlHome > Pref.minIntervalClawlHome) {
        await this.runClawlerHomeTL()
        this.dateLastClawlHome = Date.now()
      } else {
        if(showMessage)
          this.statusDissolve = 'Please wait a few moments...'
        return
      }

      if(Date.now() - this.dateLastClawlEachUser > Pref.minIntervalClawlEachUser) {
        await this.runClawlerEachUser()
        this.dateLastClawlEachUser = Date.now()
      }
    },

    async runClawlerEachUser(){
      if(!this.usersCount)
        return await lag()

      if(this.isProcessing)
        throw new Error('process collision caused.')
      this.isProcessing = true
      this.twitterApiErrorMessage = ''

      const us = []
      for(const [uid, u] of Object.entries(this.users)) {
        us.push({
          ...u,
          id: uid,
          date_last_checked: u.date_last_checked || -1,
        })
      }
      assert(us.every(o=>typeof o.date_last_checked === 'number'))
      us.sort((a,b)=>(a.date_last_checked-b.date_last_checked))
      __DEBUG.log('runClawlerEachUser: us', us)

      const usersNext = clone(this.users)
      // const limit = 5
      const limit = Pref.clawlEachUserMaxProcess
      const us2 = us.slice(0,limit)
      const us2Blocks = eachSlice(us2, Pref.parallelConnection)
      const thumbnailPs = []

      const err = await handleTwErrorAll2(async _=>{
        for(const block of us2Blocks) {
          const b = await Promise.all( block.map(u=> TwApi.getUserTimeline({
              user_id:u.userId,
              // count:10,
              count:3,
              trim_user: true,
              exclude_replies: Pref.excludeRepliesOnClawl,
              // include_rts: true,
              since_id: (u.last_tweet_id && !(Pref.alwaysShowAllClawlTlAtFirst && this.firstClawlEachUser))
                          ? incrementStrId(u.last_tweet_id, 0)  : null,
            }) ) )

          for(const [u, tweetsRaw0] of zip(block,b)) {
            if(cannotViewUserTimeline(tweetsRaw0)) {
              console.warn('runClawlerEachUser Warning: the user is protected account:', tweetsRaw0, u)
              continue
            }

            const tweetsRaw = tweetsRaw0.filter(v=> new Date(v.created_at).getTime() >  (u.date_last_tweeted||0))
            __DEBUG.log('clawl each user tweets', tweetsRaw, u.screen_name, u)
            assert(typeof u.userId === 'string')
            const un = usersNext[u.userId]
            const t = Date.now()
            un.date_last_checked = t

            ///
            if(!this.popuptweets[u.userId])
              this.popuptweets[u.userId] = []
            const ptprev = this.popuptweets[u.userId]

            if(tweetsRaw.length) {
              un.date_last_updated = t
              un.date_last_tweeted = _do(_=>{
                  const res2 = tweetsRaw.filter(tw=> isVisibleTweetInHome(tw, usersNext) )
                  return res2.length ? new Date(res2[0].created_at).getTime() : un.date_last_tweeted
                })
              un.last_tweet_id = tweetsRaw[0].id_str
              un.tweet_updated = true
              un.tweet_update_state = 'hot'

              const ptnext = tweetsRaw.map(t=>TwData.popuptweet(t))
              this.popuptweets[u.userId] = ptnext.concat(ptprev).slice(0,3)

              for(const pt of this.popuptweets[u.userId]){
                pt.hot=true
                if(ohas(pt,'extended_entities.media')) {
                  /// generate thumbnail image
                  for(const m of pt.extended_entities.media)
                    this.makeThumbnail(m.media_url)
                }
              }
            } else {
            }
          }

          this.users = usersNext
        }
      })

      if(err)
        this.notifyHandledError('runClawlerEachUser', err)
      else
        this.clearErrorMessages()

      this.isProcessing = false
      this.firstClawlEachUser = false
      this.sortUsers()
      this.$forceUpdate() ///

      this.saveUsersToStorage()
    },

    async runClawlerHomeTL(){
      if(this.pseudoMyself)
        return console.warn('runClawlerHomeTL Warning: in pseudo myself.')

      // if(!this.usersCount)
      //   return await lag()

      if(this.isProcessing)
        throw new Error('process collision caused.')
      this.isProcessing = true
      this.twitterApiErrorMessage = ''

      let tweetsRaw0
      const err = await handleTwErrorAll2(async _=>{
        tweetsRaw0 = await TwApi.getHomeTimeline({
          // count:10,
          // count:100,
          count:200,

          // trim_user: true,
          // exclude_replies: true, /// test
          exclude_replies: false,
          // include_rts: true,
          since_id: this.homeLastTweetId ? incrementStrId(this.homeLastTweetId, 0) : null,
        })
      })


      if(err)
        this.notifyHandledError('runClawlerHomeTL', err)
      else {
        this.clearErrorMessages()

        __DEBUG.log('clawl home tweets', tweetsRaw0)
        this.tlRawHome = tweetsRaw0.concat(this.tlRawHome)
        const tweetsRaw = tweetsRaw0.filter(t=>t.user.id_str !== this.myself.userId)

        const tweetsEachUser = {}
        for(const t of tweetsRaw) {
          const uid = t.user.id_str
          assert(typeof uid === 'string')

          if(!this.users[uid])
            continue

          if(!tweetsEachUser[uid])
            tweetsEachUser[uid] = []
          tweetsEachUser[uid].push(t)
        }

        const thumbnailPs = []
        for(const [uid, tweetsRaw0] of Object.entries(tweetsEachUser)) {
          const u = this.users[uid]
          assert(u)

          const tRaw = Pref.alwaysShowAllClawlHomeTlAtFirst && this.firstClawlHome
                      ? tweetsRaw0
                      : tweetsRaw0.filter(v=> new Date(v.created_at).getTime() > (u.date_last_tweeted||0) )
          if(!tRaw.length)
            continue

          this.refreshUser(u.userId, TwData.user(tRaw[0].user))

          const t = Date.now()
          u.date_last_checked = t
          u.date_last_updated = t
          u.date_last_tweeted = new Date(tRaw[0].created_at).getTime()
          u.last_tweet_id = tRaw[0].id_str
          u.tweet_updated = true
          u.tweet_update_state = 'hot'

          ///
          if(!this.popuptweets[u.userId])
            this.popuptweets[u.userId] = []
          const ptprev = this.popuptweets[u.userId]
          ptprev.forEach(pt=>pt.hot = false)

          const ptnext = tRaw.map(t=>TwData.popuptweet(t))
          this.popuptweets[u.userId] = ptnext.concat(ptprev).slice(0,3)

          for(const pt of this.popuptweets[u.userId]){
            pt.hot=true
            if(ohas(pt, 'extended_entities.media')) {
              /// generate thumbnail image
              for(const m of pt.extended_entities.media)
                this.makeThumbnail(m.media_url)
            }
          }
        }

        if(this.tlRawHome.length)
          this.homeLastTweetId = this.tlRawHome[0].id_str
      }


      this.isProcessing = false
      this.firstClawlHome = false
      this.sortUsers()

      if(this.tlUserProfile.tlType === 'home')
        await this.generateTimelineDisplay(this.tlRawHome, 0, this.cursorTl)

      this.$forceUpdate() ///

      this.saveUsersToStorage()

    },
    async ui_runClawlerHomeTL(){

    },

    cooldownUsers(){
      for(const u of Object.values(this.users)) {
        u.tweet_updated = false
        if(u.tweet_update_state === 'hot')
          u.tweet_update_state = 'cool'
        else if(!u.tweet_update_state) {
          delete this.popuptweets[u.userId]
        }

        if(this.popuptweets[u.userId])
          this.popuptweets[u.userId].forEach(pt=>pt.hot=false)
      }
      this.$forceUpdate() ///

      this.saveUsersToStorage()
    },
    ui_unpopup(){
      for(const u of Object.values(this.users)) {
        u.tweet_updated = false
        u.tweet_update_state = ''
        delete this.popuptweets[u.userId]
      }
      this.$forceUpdate() ///

      // this.saveUsersToStorage()
    },

    sortUsers(){
      const _prevMode = this.sortUsers._prevMode || ''

      const spiralCoef = Pref.spiralCoef
      const offset = _do(_=>{
        if(this.clawled)
          return 0

        const R = 300
        for(const i of range(1000)) {
          const [x,y] = spiral(i, spiralCoef)
          if(x**2+y**2 >= R**2)
            return i
        }
        return 0
      })

      const makeOrder = usersSorted=>{
        const o = {}
        const zm=10000
        usersSorted.forEach((u,i)=>o[u.userId]=zm-i)
        return o
      }


      if(this.usermapSortingMode === 'new') {
        /// sort mode : last tweet date
        const usersSorted = Object.values(this.users)
                              .sort((a,b)=> (b.date_last_tweeted||0) - (a.date_last_tweeted||0))

        const userTransforms = {}
        // const sortingShape = 'spiral'
        // const sortingShape = 'wave'
        const sortingShape = this.sortingShape
        for(const [i, u] of usersSorted.entries()) {
          const [x,y] = $switch2(sortingShape, {
            'spiral': _=> spiral(i+offset, spiralCoef),
            // 'wave': _=> wave(i+offset),
            'wave': _=> wave(i, Pref.waveCoef),
          })
          userTransforms[u.userId] = transformStrFromNums({x,y})
        }
        this.noCustomTransformUsers = null
        this.userTransforms = userTransforms
        this.usersSortedOrder = makeOrder(usersSorted)

      } else if(this.usermapSortingMode === 'custom') {
        if(_prevMode !== this.usermapSortingMode) {
          const noCustomTransformUsers = {}
          const trs = clone(this.userTransformsCustomMap)
          const coef = {...spiralCoef, radius: spiralCoef.radius/1.5}
          Object.keys(this.users).filter(uid=>!trs[uid]).forEach((uid, i)=>{
            const [x,y] = spiral(i, coef)
            trs[uid] = transformStrFromNums({x,y})
            noCustomTransformUsers[uid] = true
          })
          this.noCustomTransformUsers = noCustomTransformUsers
          this.userTransforms = trs
          this.usersSortedOrder = makeOrder(Object.values(this.users))
        }

      } else
        throw new Error('sortUsers Error: invalid mode: '+this.usermapSortingMode)


      this.sortUsers._prevMode = this.usermapSortingMode

      /// test
      const style = html(`<style> .user-unit { transition: transform 1000ms ease !important; } </style>`)
      document.body.append(style)
      setTimeout(_=>style.remove(), 1000)
    },


    ui_exportUserData(){
      assert(this.myself)
      const a = this.$refs.exportUserDataHiddenLink
      assert(a && a.tagName==='A')

      const data = ImportExport.getUserData(this)
      __DEBUG.log('ui_exportUserData', data)

      const buildDateStr = _=>{
        const d = new Date()
        const y = ''+d.getFullYear()
        const m = (''+(d.getMonth()+1)).padStart(2,'0')
        const da = (''+d.getDate()).padStart(2,'0')
        const a = d.getTime() - new Date(`${y}/${m}/${da}`).getTime()
        return `${y}${m}${da}-${a}`
      }
      const filename = `Shinkai UserData ${this.myself.screen_name} ${buildDateStr()}.json`
      const blob = new Blob([ JSON.stringify(data, null, 2) ], { 'type' : 'text/plain' })
      const url = URL.createObjectURL(blob)
      a.download = filename
      a.href = url
      a.click()
      setTimeout(_=>{
        URL.revokeObjectURL(url)
        a.href='#'
      }, 10*1000)
    },
    ui_importUserData(){
      assert(this.myself)
      const fi = this.$refs.importUserDataHiddenFileInput
      assert(fi && fi.tagName==='INPUT' && fi.type==='file')

      const loadData = data=>{
        try{
          ImportExport.setUserData(this, data)
        }catch(e){
          console.error('ui_importUserData', data)
          this.generalErrorMessages.push(String(e))
          return
        }
        this.sortUsers()
        this.statusDissolve = 'import user data done.'
        this.$forceUpdate()
      }

      const onchange = e=>{
        fi.removeEventListener('change', onchange)
        const reader = new FileReader()
        reader.onload = ()=>{
          const text = reader.result
          let data = null
          try{
            data = JSON.parse(text)
          } catch(e){
            console.error('ui_importUserData Error: failed to parse as JSON.', String(text).slice(0,200))
            this.generalErrorMessages.push('ui_importUserData Error: failed to parse as JSON.')
            return
          }
          loadData(data)
        }
        assert(e.target===fi)
        reader.readAsText(fi.files[0])
      }
      fi.addEventListener('change', onchange)
      fi.click()
    },

    loadDataFromStore(){
      this.users = Storage.loadUserData(this) || {}
      this.userTransformsCustomMap = Storage.loadCustomMapData(this) || {}
      this.sortUsers()
    },
    saveDataToStore(){
      this.saveUsersToStorage()
      this.saveCustomMapToStorage()
    },

    saveUsersToStorage(){
      if(this.pseudoMyself)
        return console.warn('saveUsersToStorage Warning: in pseudo myself.')

      this.validate()
      Storage.saveUserData(this)
    },
    saveCustomMapToStorage(){
      if(this.pseudoMyself)
        return

      Storage.saveCustomMapData(this)
    },


    imageViewerUrl(url, i){
      return url.replace(/\/\/twitter\.com/, 'mobile.twitter.com').replace(/\/\d+$/, '/'+(i+1))
    },

    getTransform(){
      return [this.transX, this.transY, this.transScale]
    },
    setTransform(x,y,scale=null){
      if(scale===null)
        scale = this.transScale
      const elem = this.$refs.usermapviewTransform
      this.transX = x
      this.transY = y
      this.transScale = scale
      elem.style['transform'] = transformStrFromNums({x,y,scale})
    },

    handleUsersViewMouse(e){
      e.preventDefault()
      this._viewNavigationCanceled = false

      const [x0, y0, s0] = this.getTransform()
      const loc0 = {x:x0, y:y0}
      const p0 = {x:e.pageX, y:e.pageY}

      const elem = this.$refs.usermapviewTransform
      const setLocation = (x,y)=>{ /// test
        if(!this._viewNavigationCanceled)
          elem.style['transform'] = transformStrFromNums({x,y,scale:s0})
      }
      const setLocationLast = (x,y)=>{
        if(!this._viewNavigationCanceled)
          this.setTransform(x,y)
      }

      /*const updateVisibility = _=>{
        const app = this
        const a = getUsersByBound(app.userTransforms, app.getUserMapViewRect()
                       , {transX:app.transX, transY: app.transY, transScale: app.transScale}
                       // , 0)
                       , 10)
        app.usermapVisibleUsers = oset(a)
        // app.$forceUpdate()
      }*/

      const dragThres = Pref.dragThres
      let dragged = false
      const isDrag = p=> dragged || (dragged = (p0.x-p.x)**2+(p0.y-p.y)**2 >= dragThres**2)
      const throttle = ThrottleTime.create()

      const ctrlPressed = !!e.ctrlKey
      const rightMouse = e.button===2 /// right mouse
      const inverted = ctrlPressed || rightMouse
      const useSailMove = inverted ? !this.useSailMove : this.useSailMove

      const disableContextMenu = e=>e.preventDefault()
      document.addEventListener('contextmenu', disableContextMenu)

      if(useSailMove) {
        /// navigation sail move
        // elem.style['transition'] = 'transform 200ms linear'

        const k = Pref.sailmoveCoef
        let p = null
        let loc = {x: loc0.x, y: loc0.y}
        const tid = setInterval(_=>{
          if(!p || !isDrag(p))
            return
          const dp = {x: p.x-p0.x, y: p.y-p0.y}
          loc.x -= dp.x*k
          loc.y -= dp.y*k
          loc.x = Math.round(loc.x)
          loc.y = Math.round(loc.y)
          setLocation(loc.x, loc.y)
          // updateVisibility()
        }, 100)

        const move = e=>{
          e.preventDefault()
          if(throttle(1000/60))
            return
          p = {x: e.pageX, y: e.pageY}
        }
        const up = e=>{
          setLocationLast(loc.x, loc.y)
          // elem.style['transition'] = ''
          if(p) {
            if(isDrag(p)) {
              e.preventDefault()
            }
          }


          clearInterval(tid)
          document.removeEventListener('mousemove', move)
          document.removeEventListener('mouseup', up)
          setTimeout(_=> document.removeEventListener('contextmenu', disableContextMenu), 10)
        }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)

      } else {
        /// navigation drag move
        // elem.style['transition'] = 'transform 50ms linear'
        elem.style['transition'] = 'transform 0ms linear'

        const move = e=>{
          e.preventDefault()
          if(throttle(1000/60))
          // if(throttle(1000/30))
            return
          const p = {x: e.pageX, y: e.pageY}
          if(isDrag(p)) {
            setLocation(loc0.x + p.x - p0.x, loc0.y + p.y - p0.y)
            // updateVisibility()
          }
        }
        const up = e=>{
          move(e)
          const p = {x: e.pageX, y: e.pageY}
          setLocationLast(loc0.x + p.x - p0.x, loc0.y + p.y - p0.y)
          elem.style['transition'] = ''
          if(isDrag(p)) {
            e.preventDefault()
          }

          document.removeEventListener('mousemove', move)
          document.removeEventListener('mouseup', up)
          setTimeout(_=> document.removeEventListener('contextmenu', disableContextMenu), 10)
        }
        document.addEventListener('mousemove', move)
        document.addEventListener('mouseup', up)
      }

    },

    getUserMapViewRect(){
      const {x,y,width,height} = this.$refs.usermapview.getClientRects()[0]
      return {x,y,width,height}
    },

    handleUsersViewWheel(e){
      const direction = e.deltaY < 0 ? -1 : 1

      const {x,y,width,height} = this.getUserMapViewRect()
      const [cx, cy] = Pref.zoomOnMouse ? [e.pageX-x, e.pageY-y]
                                        : [Math.round(width/2), Math.round(height/2)]

      const [xx, yy, s0] = this.getTransform()
      app.transfOrigin = `0px 0px`

      const k = 2**(1/4)
      const s = s0 * (direction < 0 ? k : 1/k)
      const x2 = cx + (s/s0)*(xx-cx)
      const y2 = cy + (s/s0)*(yy-cy)
      this.setTransform(x2, y2, s)
    },

    tweakProfileImage(user, width, height){
      if(Pref.stopProfileGifAnimation && user.profile_image_url.match(/\.gif$/i)) {
        /// stop gif animation
        getResizedImage(user.profile_image_url, url=>{
          user.profile_image_url = url
          this.$forceUpdate()
        }, {maxSize:Math.max(width,height)})
      }
    },

    permalinkUrl(tweet){
      if(!tweet.tweetId && tweet.userScreenName)
        return ''
      const url = `https://mobile.twitter.com/${tweet.userScreenName}/status/${tweet.tweetId}`
      return url
    },
    permalinkClicked(e){
      e.preventDefault()
      assert(e.target.tagName==='A' && e.target.href)
      window.open(e.target.href)
    },


    ui_toggleUsermapSortingMode(){
      this.usermapSortingMode = nextof(['custom', 'new'], this.usermapSortingMode)
      this.sortUsers()
    },
    ui_toggleNavigationMode(){
      this.useSailMove = !this.useSailMove
    },
    ui_toggleSortingShape(){
      this.sortingShape = nextof(['spiral', 'wave'], this.sortingShape)
      this.sortUsers()
    },

    ui_showHelp(){
      window.open('https://github.com/a-nakanosora/Shinkai/blob/master/docs/')
    },


    blockProcess(name){
      if(!this.blockProcess._dict)
        this.blockProcess._dict = {}

      if(this.blockProcess._dict[name]===true)
        return true
      this.blockProcess._dict[name] = true
      return false
    },
    unblockProcess(name, {later=-1}={}){
      assert(this.blockProcess._dict[name] === true)
      if(later > 0)
        setTimeout(_=>this.blockProcess._dict[name] = false, later)
      else
        this.blockProcess._dict[name] = false
    },

    notifyHandledError(name, err){
      assert(err.handled)
      console.warn(`${name}: handled Error:`, err)
      if(err.errorType==='TWITTER_API_ERROR')
        this.showTwApiErrorMessageGeneral(err)
      else if(err.errorType==='FETCH_ERROR')
        this.generalErrorMessages.push(err.message)
      else
        throw err
    },
    showTwApiErrorMessageGeneral(twerr){
      assert(twerr.code && twerr.message)
      if(twerr.code === TwitterErrorCode.RATE_LIMIT_EXCEEDED)
        this.twitterApiErrorMessage = 'Error: Rate limit exceeded. Please wait a few moments...'
      else
        this.twitterApiErrorMessage = twerr.message
    },
    clearErrorMessages(){
      this.twitterApiErrorMessage = ''
      this.generalErrorMessages = []
    },

  },
})




function transformStrToNums(transformStr){
  const m = transformStr.match(/translate\(\s*(-?[\d\.]+)px\s*\,\s*(-?[\d\.]+)px\s*\)/)
  const [x, y] = m ? m.slice(1,3).map(v=>Number(v)) : [null, null]

  const m2 = transformStr.match(/scale\(\s*([\d\.]+)\s*\)/)
  const scale = m2 ? Number(m2[1]) : null
  return {x,y,scale}
}

function transformStrFromNums({x=null, y=null, scale=null}){
  assert(x===null || typeof x ==='number')
  assert(y===null || typeof y ==='number')
  assert(scale===null || typeof scale ==='number')

  const res = []
  if(x!==null&&y!==null)
    res.push(`translate(${x}px, ${y}px)`)
  if(scale!==null)
    res.push(`scale(${scale})`)
  return res.join(' ')
}

function getUsersByBound(userTransforms, rect, viewTransform, margin=0){
  // const {x,y,width,height} = rect
  const {transX, transY, transScale} = viewTransform

  const left = (rect.x-transX)/transScale
  const top = (rect.y-transY)/transScale
  const right = ((rect.x+rect.width)-transX)/transScale
  const bottom = ((rect.y+rect.height)-transY)/transScale
  const m = margin

  const ps = omap(userTransforms, tr=> transformStrToNums(tr))
  const ps2 = ofilter(ps, ({x,y})=> x>=left-m && x<right+m && y>=top-m && y<bottom+m )
  return Object.keys(ps2)
}

function containedIn(rect, p){
  const {x:px,y:py} = p
  const {x,y,width,height} = rect
  return x<=px && px<x+width && y<=py && py<y+height
}
function isVisibleRectIn(rectWindow, rect){
  const {x,y,width,height} = rect
  const r = x+width
  const b = y+height
  return [{x,y},{x:r,y},{x,y:b},{x:r,y:b}].some(p=> containedIn(rectWindow, p))
}

function nextof(arr, v){
  assert(arr.includes(v))
  return arr[(arr.indexOf(v)+1)%arr.length]
}
