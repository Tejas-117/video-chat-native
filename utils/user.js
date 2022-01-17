const users = [];

function addUser(username, id, room) {
   const user = { username, id, room };

   users.push(user);
   return user;
}

function getUser(id){
   return users.find(user => user.id === id);
}

function removeUser(id){
   const index = users.findIndex(user => user.id === id);

   if(index !== -1){
      return users.splice(index, 1)[0];
   }
}

function getRoomUsers(room){
   const allUser = users.filter(user => user.room === room);
   return allUser;
}

module.exports = {
   addUser, 
   getUser, 
   removeUser,
   getRoomUsers
}