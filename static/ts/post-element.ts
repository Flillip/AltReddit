import { Cache } from './reddit/cache.js';
import { NoToken } from './reddit/errors.js';
import { showError, sanitizeHtml, redditAPI, showSuccess } from "./script.js";

const template = document.createElement('template');
template.innerHTML = `
<link rel="stylesheet" href="./static/css/post.css">

<div class="post">
  <div id="p-left">
    <div class="arrow" id="upvote"> <img width="20%" src="./static/svg/upvote.svg" alt="upvote"> </div>
    <div class="arrow" id="downvote"> <img width="20%" src="./static/svg/upvote.svg" alt="downvote"> </div>
    <div class="save" id="save"> <img id="bookmark" width="20%" src="./static/svg/save.svg" alt="save"></div>
    <div class="share" id="share"> <img width="20%" src="./static/svg/share.svg" alt="share"> </div>

    <div class="bottom">
      <button class="login hidden" id="login-btn" onclick="login()">Log in</button>
      <a id="pfp-click" class="hidden"><img class="user-pfp" id="profile-pic" src="" alt="User avatar"></a>
      <button class="login hidden" id="logout-btn" onclick="logout()">Log out</button>
      <!-- <button onclick="show_error('test')">error</button> -->
    </div>
  </div>
  <div id="p-middle">
    <div class="header" id="header">
      <div class="left-align-center">
        <img id="sub-logo" src="./static/img/subreddit_default.png" alt="subreddit logo">
        <div class="info-title">
          <p class="post-info"><a id="sub" href="?r/test">r/test</a> by <a id="author" href="?u/tester">u/tester</a></p>
          <p class="title" id="title">Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula
            eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus
            mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim.
            Donec.</p>
        </div>
      </div>
    </div>
    <div class="content" id="content">
      <img id="image" class="hidden"
        src="https://images.unsplash.com/photo-1681927269046-1263e3282bb8?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1170&q=80"
        alt="reddit post image">
      <a id="url" class="hidden"></a>
      <p id="txt" class="hidden"></p>
    </div>
  </div>
  <div id="p-right">
    <slot name="comment" class="comments"></slot>
  <!--
    <div class="comment">
      <div class="comment-content">
        <div class="row-1">
          <div class="arrow" id="upvote"> <img width="100%" src="./static/svg/upvote.svg" alt="upvote"> </div>
          <div class="arrow" id="downvote"> <img width="100%" src="./static/svg/upvote.svg" alt="downvote"> </div>
        </div>
        <div class="row-2">
          <div class="user">
            <img class="pfp" src="./static/img/subreddit_default.png" alt="subreddit logo">
            <a href="user1">user1</a>
          </div>
          <p class="comment-text">this is a test</p>
        </div>
      </div>

      <div class="separator">
        <button class="collapse-line"></button>


        <div class="comment">

        <div class="comment-content">
        <div class="row-1">
          <div class="arrow" id="upvote"> <img width="100%" src="./static/svg/upvote.svg" alt="upvote"> </div>
          <div class="arrow" id="downvote"> <img width="100%" src="./static/svg/upvote.svg" alt="downvote"> </div>
        </div>
        <div class="row-2">
          <div class="user">
            <img class="pfp" src="./static/img/subreddit_default.png" alt="subreddit logo">
            <a href="user2">user2</a>
          </div>
          <p class="comment-text">this is also a test</p>
        </div>
      </div>
        </div>
      </div>
    -->
    </div>
  </div>
`;

// get's image urls in regex
const imageRegex = /https?:\/\/(?:[a-zA-Z0-9_-]+\.)+[a-zA-Z0-9]{2,6}(?:\/[^\/\s]+)+\.(?:jpe?g|png|bmp|gif?v|webp)(?:\?\S*)?/g;

// entire string is image url.
const entireRegex = /^https?:\/\/(?:[a-zA-Z0-9_-]+\.)+[a-zA-Z0-9]{2,6}(?:\/[^\/\s]+)+\.(?:jpe?g|png|bmp|gif?v|webp)(?:\?\S*)?$/g;

type voteState = 'upvoted' | 'neutral' | 'downvoted';

export function fixHtml(html: string): string {
    html = html
    .replace(new RegExp('&lt;', 'g'), '<')          // <
    .replace(new RegExp('&gt;', 'g'), '>')          // >
    .replace(new RegExp('&amp;#39;', 'g'), '&#39;') // '
    .replace(new RegExp('&amp;', 'g'), '&');        // &
    
    const tempElement = document.createElement('div');
    tempElement.innerHTML = html;

    const anchorElements = tempElement.querySelectorAll('a');

    if (anchorElements.length === 0)
        return html;

    const prevAnchorHtml: string[] = [];
    const newHtml: string[] = [];

    anchorElements.forEach(a => {
        const match = a.href.match(entireRegex);

        if (match !== null && match.length === 1 && a.href === match[0]) {
            prevAnchorHtml.push(a.outerHTML);
            newHtml.push(`<img src='${a.href}' alt='reddit image'>`);
        } else if (a.href.startsWith('http://127.0.0.1:5000/r/')) {
            prevAnchorHtml.push(a.outerHTML);
            newHtml.push(`<a href="${a.href.replace('/r', '?link=r')}">${a.innerText}</a>`);
        }
    });

    for (let i = 0; i < prevAnchorHtml.length; i++) {
        html = html.replace(prevAnchorHtml[i], newHtml[i]);
    }
        
    return html;
}

export class PostElement extends HTMLElement {
    private redditUrl: string;
    private postSaved?: boolean;
    private voteState: voteState;
    
    constructor() {
        super();

        const shadow = this.attachShadow({ mode: 'open' });
        shadow.append(template.content.cloneNode(true));

        this.redditUrl = '';
        this.postSaved = undefined;
        this.voteState = 'neutral';

        const left   = this.shadowRoot?.getElementById('p-left') as HTMLElement;
        const middle = this.shadowRoot?.getElementById('p-middle') as HTMLElement;
        const right  = this.shadowRoot?.getElementById('p-right') as HTMLElement;

        const resizeRight = () => {
            if (this.shadowRoot === null) return;
            
            console.log('resized');
            const newWidth = `calc(90vw - ${left.offsetWidth}px - ${middle.offsetWidth}px)`;
            right.style.width = newWidth.replace('90vw', '100vw');

            console.log('getting comments');
            const slot = this.shadowRoot.querySelector<HTMLSlotElement>('slot[name=comment]') as HTMLSlotElement;
            const comments = slot.assignedElements();

            console.log(comments)
            comments.forEach(comment => {
                comment.setAttribute('max-width', newWidth);
                console.log('setting comment width')
            });
        }

        new ResizeObserver(resizeRight).observe(middle);
        
        this.registerButtons();
        this.showLogin();
    }

    set logo(value: string) {
        const logo = this.shadowRoot?.getElementById('sub-logo') as HTMLImageElement;
        logo.src   = value;
    }

    set subredditName(value: string) {
        const sub     = this.shadowRoot?.getElementById('sub') as HTMLAnchorElement;
        sub.innerText = value;
        sub.href      = '?link=' + value;
    }

    set postAuthor(value: string) {
        const author     = this.shadowRoot?.getElementById('author') as HTMLAnchorElement;
        author.innerText = value;
        author.href      = '?link=u/' + value;
    }

    set postTitle(value: string) {
        const title      = this.shadowRoot?.getElementById('title') as HTMLElement;
        title.innerText  = value;
    }

    set postImage(value: string) {
        const image = this.shadowRoot?.getElementById('image') as HTMLImageElement;
        image.src   = value;
        image.classList.remove('hidden');

        setTimeout(() => {
            const content = this.shadowRoot?.getElementById('content') as HTMLElement;
            const header  = this.shadowRoot?.getElementById('header') as HTMLElement;
            content.style.maxHeight = `calc(100% - 2em - ${header.offsetHeight}px)`;
        }, 500);
    }

    set postTxt(value: string) {
        const txt = this.shadowRoot?.getElementById('txt') as HTMLElement;
        txt.classList.remove('hidden');
        
        if (value.startsWith('&lt;!-- SC_OFF --&gt;') && value.endsWith('&lt;!-- SC_ON --&gt;')) {
            txt.innerHTML = fixHtml(value);
            return;
        }

        const urls = value.match(imageRegex) ?? [];
        const removedUrls = value.replace(imageRegex, '{{THE_URL}}');
        let sanitized = sanitizeHtml(removedUrls);
    
        for (let i = 0; i < urls.length; i++) {
            sanitized = sanitized.replace(/{{THE_URL}}/, '<img src="' + urls[i].toString() + '" alt="reddit image">');
        }
        
        txt.innerHTML = sanitized;

        const content = this.shadowRoot?.getElementById('content') as HTMLElement;
        content.style.overflow = 'scroll';
    }

    set postUrl(value: string) {
        const url     = this.shadowRoot?.getElementById('url') as HTMLAnchorElement;
        url.href      = value;
        url.innerText = value;
        url.classList.remove('hidden');
    }

    set saved(value: string) {
        const bValue = value === 'true';
        console.log(bValue);
        
        const bookmark = this.shadowRoot?.getElementById('bookmark') as HTMLImageElement;
        if (bValue) {
            bookmark.src = './static/svg/saved.svg';
            bookmark.classList.add('saved');
            if (this.postSaved !== undefined) 
                showSuccess('Post saved!');
        }  else {
            bookmark.src = './static/svg/save.svg';
            bookmark.classList.remove('saved');
            if (this.postSaved !== undefined) 
                showSuccess('Post unsaved!');
        }
        
        this.postSaved = bValue;
    }
    
    static get observedAttributes() { return ['subreddit-logo', 'subreddit-name', 'post-author', 'post-title', 'post-img', 'post-txt', 'post-url', 'reddit-url', 'post-saved', 'post-vote']; }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        console.log(name, oldValue, newValue);
        
        if (name === 'subreddit-logo') {
            this.logo = newValue;
        } else if (name === 'subreddit-name') {
            this.subredditName = newValue;
        } else if (name === 'post-author') {
            this.postAuthor = newValue;
        } else if (name === 'post-title') {
            this.postTitle = newValue;
        } else if (name === 'post-img') {
            this.postImage = newValue;
        } else if (name === 'post-txt') {
            this.postTxt = newValue;
        } else if (name === 'post-url') {
            this.postUrl = newValue;
        } else if (name === 'reddit-url') {
            this.redditUrl = newValue;
        } else if (name === 'post-saved') {
            this.saved = newValue;
        } else if (name === 'post-vote') {
            this.voteState = newValue === '1' ? 'upvoted' : newValue === '-1' ? 'downvoted' : 'neutral';
            if (this.voteState === 'upvoted') {
                const upvoteBtn = this.shadowRoot?.getElementById('upvote') as HTMLElement;
                upvoteBtn.classList.remove('voted');
                (upvoteBtn.querySelector('img') as HTMLImageElement).src = './static/svg/upvoted.svg';
            } else if (this.voteState === 'downvoted') {
                const downvoteBtn = this.shadowRoot?.getElementById('downvote') as HTMLElement;
                downvoteBtn.classList.remove('voted');
                (downvoteBtn.querySelector('img') as HTMLImageElement).src = './static/svg/upvoted.svg';
            }
        }
        
    }
    
    private registerButtons() {
        const upvoteBtn = this.shadowRoot?.getElementById('upvote') as HTMLElement;
        const downvoteBtn = this.shadowRoot?.getElementById('downvote') as HTMLElement;
        const saveBtn = this.shadowRoot?.getElementById('save') as HTMLElement;
        const shareBtn = this.shadowRoot?.getElementById('share') as HTMLElement;

        upvoteBtn.onclick = () => {
            let vote: -1 | 0 | 1;
            let svg: string;
            let state: voteState; 
            switch(this.voteState) {
                case 'upvoted':   
                    upvoteBtn.classList.remove('voted');
                    vote = 0;
                    svg = './static/svg/upvote.svg';
                    state = 'neutral';
                    break;

                case 'neutral':
                case 'downvoted': 
                    upvoteBtn.classList.add('voted');
                    vote = 1;
                    svg = './static/svg/upvoted.svg';
                    state = 'upvoted';

                    // stupid bug on reddit servers
                    if (this.voteState === 'downvoted')
                        redditAPI.votePost(this.id, 0);
                    break;
            }

            (upvoteBtn.querySelector('img') as HTMLImageElement).src = svg;
            (downvoteBtn.querySelector('img') as HTMLImageElement).src = './static/svg/upvote.svg';
            downvoteBtn.classList.remove('voted');

            redditAPI.votePost(this.id, vote);
            this.voteState = state;
        }

        downvoteBtn.onclick = () => {
            let vote: -1 | 0 | 1;
            let svg: string;
            let state: voteState; 
            switch(this.voteState) {
                case 'downvoted':   
                    downvoteBtn.classList.remove('voted');
                    vote = 0;
                    svg = './static/svg/upvote.svg';
                    state = 'neutral';
                    break;

                case 'neutral':
                case 'upvoted': 
                    downvoteBtn.classList.add('voted');
                    vote = -1;
                    svg = './static/svg/upvoted.svg';
                    state = 'downvoted';

                    // stupid bug on reddit servers
                    if (this.voteState === 'upvoted')
                        redditAPI.votePost(this.id, 0);
                    break;
            }

            (downvoteBtn.querySelector('img') as HTMLImageElement).src = svg;
            (upvoteBtn.querySelector('img') as HTMLImageElement).src = './static/svg/upvote.svg';
            upvoteBtn.classList.remove('voted');

            redditAPI.votePost(this.id, vote);
            this.voteState = state;
        }
            
        saveBtn.onclick = () => {
            console.log(this.saved);
            
            if (this.postSaved === false) {
                redditAPI.savePost(this.id);
                this.saved = 'true';
            } else {
                redditAPI.unsavePost(this.id);
                this.saved = 'false';
            }
        }

        shareBtn.onclick = () => {
            navigator.clipboard.writeText(this.redditUrl);
            showSuccess('Url has been copied to the clipboard!');
        }
    }

    private showLogin() {
        const showLoginOutButton = (btnName: 'login' | 'logout') => {
            const btn = this.shadowRoot?.getElementById(`${btnName}-btn`) as HTMLElement;
            btn.classList.remove('hidden');
        };

        Cache.GetAboutMe().then(async (data) => {
            console.log('-------------------')
            console.log(data);

            const img         = this.shadowRoot?.getElementById('profile-pic') as HTMLImageElement;
            const pfpClick    = this.shadowRoot?.getElementById('pfp-click') as HTMLAnchorElement;
            const pfp         = data.icon_img.replace(/\?.*/g, '');
    
            img.src = pfp;

            pfpClick.href = 'https://reddit.com/user/' + data.name;
            pfpClick.classList.remove('hidden');
            
            showLoginOutButton('logout');
        }).catch((err) => {
            if (!(err instanceof NoToken))
                showError(err);
            showLoginOutButton('login'); 
        });
    }
}

customElements.define('post-element', PostElement);