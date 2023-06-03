import { RedditAPI } from './reddit/api.js';
import { Cache } from './reddit/cache.js';
import { Post } from './reddit/objects/post.js';
import { RedditComment } from './reddit/objects/comment.js';

export const redditAPI = new RedditAPI();
const error_div = document.getElementById('error') as HTMLElement;
const success_div = document.getElementById('success') as HTMLElement;

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
    showError(error_queue_msg as string);
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
function reset_animation(el: HTMLElement) {
    el.style.animation = 'none';
    el.offsetHeight; /* trigger reflow */
    el.style.animation = ''; 
}

/**
 * Show an error message
 * @param {String} msg The message to display
 */
export function showError(msg: string) {
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
export function showSuccess(msg: string) {
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
export function queueError(msg: string) {
    localStorage.setItem('error_queue_msg', msg);
    window.location.replace('/');
}

export function login() {
    redditAPI.login();
}

export function logout() {
    redditAPI.logout();
}

export function sanitizeHtml(str: string): string {
    return str.replace(/</g, "&lt;").replace(/</g, "&gt;");
}

const container = document.getElementById('post-container') as HTMLElement;

function checkURL(url: string): boolean {
    return(url.match(/\.(jpeg|jpg|gif|gifv|png)$/) != null);
}

function validURL(str: string): boolean {
    var pattern = new RegExp('^(https?:\\/\\/)?'+ // protocol
      '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|'+ // domain name
      '((\\d{1,3}\\.){3}\\d{1,3}))'+ // OR ip (v4) address
      '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*'+ // port and path
      '(\\?[;&a-z\\d%_.~+=-]*)?'+ // query string
      '(\\#[-a-z\\d_]*)?$','i'); // fragment locator
    return !!pattern.test(str);
}

async function addPost(post: Post) {
    try {
        console.log(post);
        const postEl = document.createElement('post-element');
        postEl.setAttribute('post-title', post.title);
        postEl.setAttribute('subreddit-logo', await Cache.GetLogo(post.subreddit));
        postEl.setAttribute('subreddit-name', post.subreddit_name_prefixed);
        postEl.setAttribute('post-author', post.author);
        postEl.setAttribute('reddit-url', 'https://reddit.com' + post.permalink);
        postEl.id = post.name;
        postEl.setAttribute('post-saved', String(post.saved));
        postEl.setAttribute('post-vote', (post.likes === null ? 0 : post.likes === true ? 1 : -1).toString());

        if (post.is_self)
            postEl.setAttribute('post-txt', post.selftext_html ?? post.selftext);
        else if (!checkURL(post.url) && validURL(post.url)) {
            postEl.setAttribute('post-url', post.url);
            console.log("VALID URL");
        }
        else
            postEl.setAttribute('post-img', post.url.replace('preview.redd.it', 'i.redd.it'));
        
        const comments = await redditAPI.getComments(post.subreddit, post.id);

        for (let i = 0; i < comments.length; i++) {
            addComment(comments[i], postEl); 
            // const comment = document.createElement('comment-element');
            // // comment.setAttribute('user-pfp', '');
            // comment.setAttribute('username', comments[i].author);
            // comment.setAttribute('comment-text', comments[i].body_html);
            // comment.setAttribute('slot', 'comment');
            // postEl.appendChild(comment);
        }
            
        container.appendChild(postEl);
    } catch (ex: unknown) {
        if (ex instanceof Error)
            showError(ex.toString());
    }
}

function addComment(comment: RedditComment, parent: HTMLElement) {
    const commentEl = document.createElement('comment-element');
    // comment.setAttribute('user-pfp', '');
    commentEl.setAttribute('username', comment.author);
    commentEl.setAttribute('comment-text', comment.body_html);
    commentEl.setAttribute('slot', 'comment');
    parent.appendChild(commentEl);

    if (comment.replies === undefined || comment.replies.data === undefined) return;

    for (let i = 0; i < comment.replies.data.children.length; i++) {
        if (comment.replies.kind !== 't1', comment.replies.data.children[i].kind !== 't1') continue;
        const newComment = comment.replies.data.children[i].data;
        console.log('@@@@@@@@@@@@@@@@@@@@@@@@');
        console.log(newComment);
        addComment(newComment, commentEl);
    }
}

(async () => {
    // run code after post-element and comment-element has been loaded
    console.log('awaiting post-element');
    await customElements.whenDefined('post-element');
    console.log('done post-element');
    console.log('awaiting comment-element');
    await customElements.whenDefined('comment-element');
    console.log('done comment-element');
    
    const homepageCallback = async (posts: Post[]) => {
        console.log(posts);
        for (let i = 0; i < 2; i++) {
            const post = posts[i];
            if (post.is_video || post.is_gallery || (post.media !== null && post.media.oembed !== null))
                continue;
            
            await addPost(post);
        }
    }

    if (!parameters.has('link')) {
        redditAPI.getHome().then(homepageCallback)
        .catch((error: unknown) => {
            showError(error as string);
        });

        return;
    }

    const link = parameters.get('link')?.toString() ?? 'r/reddit';

    if (link.startsWith('r/')) {
        redditAPI.getSubreddit(link.replace('r/', '')).then(homepageCallback)
        .catch((error: unknown) => {
            showError(error as string);
        });
    } else {
        redditAPI.getUser(link.replace('u/', '')).then(homepageCallback)
        .catch((error: unknown) => {
            showError(error as string);
        });
    }
})();

// https://www.reddit.com/r/ProgrammerHumor/comments/12tc5et/this_subreddit_rn/