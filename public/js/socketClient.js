const socket = io();
let name = prompt('Enter your name : ');
let id;

socket.on('connect', () => id = socket.id)

socket.emit('join-room', roomID, name);

socket.on('message', (msg = 'Default message') => {
  console.log(msg);
})


const userContainer = document.querySelector('.users-container');
// get all users in current room and display it;
socket.on('allUsers', (users) => {
  userContainer.innerHTML = '';

  users.forEach(user => {
    const html = `<div class="user">
                      <p>${user.username}</p>
                      <button id="start-button" onclick="start(event)" data-socketid="${user.id}">Start Call</button>
                  </div>`;    
    userContainer.insertAdjacentHTML('beforeend', html);
  });
})