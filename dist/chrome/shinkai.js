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
      return {redirectUrl: chrome.extension.getURL('tauth.html') + q}
    }
  },{urls: ['*://shinkaitauth/*']},['blocking'])


  /// keys example
  void function(){
    const keysExample = '{"ck":"rf20R2CMEyCiu5v2ih5xEvYhs","cks":"kc8Q9M64KWfB6V9T7czIwLlrhEhczZe5rdQCtdFjnmeoE3dCX1"}'
    if(!localStorage.shinkaiopt)
      localStorage.shinkaiopt = keysExample
  }()
}



main()