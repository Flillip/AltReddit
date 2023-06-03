var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { RedditAPI } from './reddit/api.js';
import { Cache } from './reddit/cache.js';
export const redditAPI = new RedditAPI();
const error_div = document.getElementById('error');
const success_div = document.getElementById('success');
// get the parameters
export const parameters = new URLSearchParams(window.location.search);
// get the state
const local_state = localStorage.getItem('state');
localStorage.removeItem('state'); // remove it since it's no longer necessary
if (parameters.has('state')) {
    // if the state string matches we know we sent the request
    // therefore save the authentication
    if (parameters.get('state') == local_state)
        redditAPI.getToken();
    else // otherwise send it to default url since state doesn't match
        window.location.replace('/');
}
// get the error_queue_msg and
// check if error_queue_msg has an error stored
// if it does, show the error.
const error_queue_msg = localStorage.getItem('error_queue_msg');
if (error_queue_msg !== null) {
    showError(error_queue_msg);
    localStorage.removeItem('error_queue_msg');
}
// // calculate height of image
// const header_size = (document.getElementsByClassName('header')[0] as HTMLElement).offsetHeight;
// const title_size = (document.getElementById('title-top') as HTMLElement).offsetHeight;
// const img = document.getElementById('image-top') as HTMLImageElement;
// img.height = window.innerHeight - header_size - title_size;
/**
 * Reset's the animation of a html element.
 * @param {HTMLElement} el The element to reset animation.
 */
function reset_animation(el) {
    el.style.animation = 'none';
    el.offsetHeight; /* trigger reflow */
    el.style.animation = '';
}
/**
 * Show an error message
 * @param {String} msg The message to display
 */
export function showError(msg) {
    reset_animation(error_div);
    error_div.classList.add('dialogue-animation');
    error_div.innerText = msg;
    error_div.addEventListener('animationend', () => {
        error_div.classList.remove('dialogue-animation');
    });
}
/**
 * Show an error message
 * @param {String} msg The message to display
 */
export function showSuccess(msg) {
    reset_animation(success_div);
    success_div.classList.add('dialogue-animation');
    success_div.innerText = msg;
    success_div.addEventListener('animationend', () => {
        success_div.classList.remove('dialogue-animation');
    });
}
/**
 * Queues an error to load on the next page startup.
 * @param {String} msg
 */
export function queueError(msg) {
    localStorage.setItem('error_queue_msg', msg);
    window.location.replace('/');
}
export function login() {
    redditAPI.login();
}
export function logout() {
    redditAPI.logout();
}
export function sanitizeHtml(str) {
    return str.replace(/</g, "&lt;").replace(/</g, "&gt;");
}
const container = document.getElementById('post-container');
function checkURL(url) {
    return (url.match(/\.(jpeg|jpg|gif|gifv|png)$/) != null);
}
function validURL(str) {
    var pattern = new RegExp('^(https?:\\/\\/)?' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    return !!pattern.test(str);
}
function addPost(post) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log(post);
            const postEl = document.createElement('post-element');
            postEl.setAttribute('post-title', post.title);
            postEl.setAttribute('subreddit-logo', yield Cache.GetLogo(post.subreddit));
            postEl.setAttribute('subreddit-name', post.subreddit_name_prefixed);
            postEl.setAttribute('post-author', post.author);
            postEl.setAttribute('reddit-url', 'https://reddit.com' + post.permalink);
            postEl.id = post.name;
            postEl.setAttribute('post-saved', String(post.saved));
            postEl.setAttribute('post-vote', (post.likes === null ? 0 : post.likes === true ? 1 : -1).toString());
            if (post.is_self)
                postEl.setAttribute('post-txt', (_a = post.selftext_html) !== null && _a !== void 0 ? _a : post.selftext);
            else if (!checkURL(post.url) && validURL(post.url)) {
                postEl.setAttribute('post-url', post.url);
                console.log("VALID URL");
            }
            else
                postEl.setAttribute('post-img', post.url.replace('preview.redd.it', 'i.redd.it'));
            container.appendChild(postEl);
        }
        catch (ex) {
            if (ex instanceof Error)
                showError(ex.toString());
        }
    });
}
// run code after post-element has been loaded
(() => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    yield customElements.whenDefined('post-element');
    const homepageCallback = (posts) => __awaiter(void 0, void 0, void 0, function* () {
        console.log(posts);
        for (let i = 0; i < posts.length; i++) {
            const post = posts[i];
            if (post.is_video || post.is_gallery || (post.media !== null && post.media.oembed !== null))
                continue;
            yield addPost(post);
        }
    });
    if (!parameters.has('link')) {
        redditAPI.getHome().then(homepageCallback)
            .catch((error) => {
            showError(error);
        });
        return;
    }
    const link = (_b = (_a = parameters.get('link')) === null || _a === void 0 ? void 0 : _a.toString()) !== null && _b !== void 0 ? _b : 'r/reddit';
    if (link.startsWith('r/')) {
        redditAPI.getSubreddit(link.replace('r/', '')).then(homepageCallback)
            .catch((error) => {
            showError(error);
        });
    }
    else {
        redditAPI.getUser(link.replace('u/', '')).then(homepageCallback)
            .catch((error) => {
            showError(error);
        });
    }
}))();
// https://www.reddit.com/r/ProgrammerHumor/comments/12tc5et/this_subreddit_rn/
