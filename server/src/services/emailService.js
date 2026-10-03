function escapeHtml(value=''){
  return String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
}

function markdownLinks(body=''){
  const links=[];
  const tokenized=String(body||'').replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(_,label,url)=>{
    const token=`___JT_LINK_${links.length}_${Date.now()}___`;
    links.push({token,label,url});
    return token;
  });
  return {tokenized,links};
}

function sanitizeEmailHtml(input='',linkMap=[]){
  const parsed=markdownLinks(input);
  let source=parsed.tokenized;

  // If the content is plain text, preserve line breaks while escaping it.
  if(!/<[a-z][^>]*>/i.test(source)){
    let text=escapeHtml(source).replaceAll('\n','<br>');
    for(const item of parsed.links){
      const link=linkMap.find(x=>x.originalUrl===item.url);
      const href=link?.trackedUrl||item.url;
      text=text.replaceAll(item.token,`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`);
    }
    return text;
  }

  // Keep only email-formatting tags produced by the editor. All other tags/attributes are removed.
  source=source.replace(/<\s*(script|style|iframe|object|embed|svg|img|form|input|button|video|audio)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi,'');
  source=source.replace(/<\s*(script|style|iframe|object|embed|svg|img|form|input|button|video|audio)[^>]*\/?>/gi,'');
  source=source.replace(/<!--([\s\S]*?)-->/g,'');

  source=source.replace(/<([^>]+)>/g,(full,inside)=>{
    const m=inside.trim().match(/^(\/?)\s*([a-z0-9]+)([\s\S]*)$/i);
    if(!m)return escapeHtml(full);
    const closing=!!m[1];
    const tag=m[2].toLowerCase();
    if(['strong','b','em','i','u','br','p','div','ul','ol','li'].includes(tag)){
      if(closing)return `</${tag}>`;
      return `<${tag}>`;
    }
    if(tag==='a'){
      if(closing)return '</a>';
      const href=(m[3].match(/href\s*=\s*["']([^"']+)["']/i)||[])[1]||'';
      if(!/^https?:\/\//i.test(href))return '';
      const link=linkMap.find(x=>x.originalUrl===href);
      const target=link?.trackedUrl||href;
      return `<a href="${escapeHtml(target)}" target="_blank" rel="noopener noreferrer">`;
    }
    return '';
  });

  for(const item of parsed.links){
    const link=linkMap.find(x=>x.originalUrl===item.url);
    const href=link?.trackedUrl||item.url;
    source=source.replaceAll(item.token,`<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(item.label)}</a>`);
  }

  // Convert bare URLs in plain text into links, except URLs that are already inside href attributes.
  source=source.replace(/(^|[>\s])((?:https?):\/\/[^\s<]+)/gi,(match,prefix,url)=>{
    const clean=url.replace(/[),.;]+$/,'');
    if(linkMap.some(x=>x.originalUrl===clean)){
      return `${prefix}${clean}`;
    }
    return `${prefix}<a href="${escapeHtml(clean)}" target="_blank" rel="noopener noreferrer">${escapeHtml(clean)}</a>`;
  });
  return source;
}

export function renderTrackedHtml(body,trackingUrl,linkMap=[]){
  const safeBody=sanitizeEmailHtml(body,linkMap);
  return `<div style="font-family:Arial,sans-serif;line-height:1.6">${safeBody}</div><img src="${escapeHtml(trackingUrl)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px" />`;
}

export function extractUrls(body=''){
  const urls=[];
  const text=String(body||'');
  const markdown=/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let m;
  while((m=markdown.exec(text))) urls.push(m[2]);
  const hrefs=/href\s*=\s*["'](https?:\/\/[^"']+)["']/gi;
  while((m=hrefs.exec(text))) urls.push(m[1]);
  const raw=text.match(/https?:\/\/[^\s<)"']+/g)||[];
  urls.push(...raw);
  return [...new Set(urls)];
}
