/**
extension background
*/


///
function main(){
  chrome.browserAction.onClicked.addListener(tab=>{
    chrome.tabs.create({ url: chrome.extension.getURL('index.html') })
  })

  /// redirect
  chrome.webRequest.onBeforeRequest.addListener(o=>{
    if(/\/\/shinkaitauth\//i.test(o.url)) {
      /// redirect to tauth.html
      const q = o.url.replace(/^[^\?]+/, '')
      console.log('Siderite', o, chrome.extension.getURL('tauth.html'), q)
      return {redirectUrl: chrome.extension.getURL('tauth.html') + q}
      // return {redirectUrl: 'http://www.google.com/' + q}
    }
  // },{urls: ['<all_urls>']},['blocking'])
  // },{urls: ['*://shinkaitauthredirectorfakeurl.abc/*']},['blocking'])
  },{urls: ['*://shinkaitauth/*']},['blocking'])



}



main()