import RedditAPI from "./reddit/api.js";

const redditAPI = new RedditAPI();
const error_div = document.getElementById("error");

/**
 * Reset's the animation of a html element.
 * @param {HTMLElement} el The element to reset animation.
 */
function reset_animation(el) {
    el.style.animation = 'none';
    el.offsetHeight; /* trigger reflow */
    el.style.animation = null; 
}

/**
 * Show an error message
 * @param {String} msg The message to display
 */
function show_error(msg) {
    reset_animation(error_div);
    error_div.classList.add('error-animation');
    error_div.innerText = msg;

    error_div.addEventListener('animationend', () => {
        error_div.classList.remove('error-animation');
    });
}

/**
 * Queues an error to load on the next page startup.
 * @param {String} msg 
 */
function queue_error(msg) {
    localStorage.setItem('error_queue_msg', msg);
    window.location.replace('/');
}

function login() {
    redditAPI.login();
}


// get the parameters
const parameters = new URLSearchParams(window.location.search);

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
if (error_queue_msg) {
    show_error(error_queue_msg);
    localStorage.removeItem('error_queue_msg');
}

/**
 * Handles any errors.
 * @param {Object} data 
 * @returns True if there was an error. Otherwise False if no error was handled.
 */
function handleRedditError(data) {
    if ('error' in data) {
        show_error(data.error);
        return true;
    }

    return false;
}

function showLoginButton() {
    const p_leftWidth = document.getElementById('p-left').offsetWidth;
    const btn = document.getElementById('login-btn');

    btn.classList.remove('hidden');
    btn.style.left = (p_leftWidth / 2 - btn.offsetWidth / 2) + "px";
}

redditAPI.getAboutMe().then((data) => {
    if (handleRedditError(data)) {
        showLoginButton();
    } else {
        const p_leftWidth = document.getElementById('p-left').offsetWidth;

        const pfp = data.icon_img.match(/.+?(?=\?)/g);
        const img = document.getElementById('profile-pic');
        const pfpClick = document.getElementById('pfp-click');

        img.src = pfp;
        
        pfpClick.href = "https://reddit.com/user/" + data.name;
        pfpClick.classList.remove('hidden');
        pfpClick.style.left = (p_leftWidth / 2 - pfpClick.offsetWidth / 2) + "px";
        
        console.log(data);
    }
}).catch((err) => {
    show_error(err);
    showLoginButton(); 
});

