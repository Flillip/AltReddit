const parameters = new URLSearchParams(window.location.hash.substring(1));

const local_state = localStorage.getItem('state');
localStorage.removeItem('state'); // remove it since it's no longer necessary

const state = parameters.get('state');

function send_error(err_msg) {
    window.location.replace(`/?error=true&err_msg=${encodeURI(err_msg)}`);
}

if (state != local_state) {
    send_error('Unknown state. Try again.');
}

const error = parameters.get('error');

if (error == "access_denied") {
    send_error('You declined the authorization. Can\'t login.');
} else if (error == "unsupported_response_type") {
    send_error('This error should\'t happen. unsupported_response_type Possible resolution: Don\' modify the reddit URL.');
} else if (error == "invalid_scope") {
    send_error('This error should\'t happen. invalid_scope. Possible resolution: Don\' modify the reddit URL.');
} else if (error == "invalid_request") {
    send_error('This error should\'t happen. invalid_request. Possible resolution: Don\' modify the reddit URL.');
}

/**
 * @param {Date} date 
 * @param {Number} seconds 
 * @returns 
 */
const addSeconds = (date, seconds) => {
    date.setSeconds(date.getSeconds() + seconds);
    return date;
}

console.log(parameters.get('expires_in'))

const access_token = parameters.get('access_token');
const token_type = parameters.get('token_type');
const expiry = addSeconds(new Date(Date.now()), Number(parameters.get('expires_in')));

localStorage.setItem('access_token', access_token);
localStorage.setItem('token_type', token_type);
localStorage.setItem('expiry', expiry.toJSON());

window.location.replace('/');