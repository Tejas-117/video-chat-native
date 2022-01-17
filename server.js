const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const socketIO = require('socket.io');
const ejs = require('ejs');
const url = require('url');
const { v4: uuidV4 } = require('uuid');
const users = require('./utils/user');

const io = new socketIO.Server(httpServer);

// maintain all active rooms
const rooms = [];

io.on('connection', (socket) => {
   socket.on('join-room', (roomID, name) => {
      socket.join(roomID);

      users.addUser(name, socket.id, roomID);

      io.to(roomID).emit('allUsers', users.getRoomUsers(roomID));

      // events handled are video-offer, video-answer, handle-ice-candidate
      socket.on('client-message', (message) => {
         switch (message.type){
            case 'video-offer': io.to(message.target).emit('server-message', message, 0);
                                 break;
            case 'video-answer': io.to(message.target).emit('server-message', message, 1);
                                 break;
            case 'new-ice-candidate': io.to(message.target).emit('server-message', message, 2);
                                 break;
            case 'hang-up': io.to(message.target).emit('server-message', message, 3);
                                 break;
         }
      })
   })
})

// middleware
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// routes
app.get('/', (req, res) => {
   res.render('index');
})

app.get('/:roomId', (req, res) => {
   const roomID = req.params.roomId;

   for (const room of rooms) {
      if(room.id === roomID) {
          return res.render('room', { roomName: room.name, roomID: room.id });
      }      
   }
   
   return res.send('Room Not Found!!');   
})

app.post('/create-room', (req, res) => {
   const { name } = req.body.room;
   const id = uuidV4();

   rooms.push({ name, id });

   res.redirect(`/${id}`);
})

app.post('/join-room/', (req, res) => {
   const urlPath = url.parse(req.body.roomUrl);
   res.redirect(`${urlPath.pathname}`);
})

// custom error handler
app.use((err, req, res, next) => {
   console.log(err);
   res.send(err.message);
})

const port = process.env.PORT || 3000;
httpServer.listen(port, () => console.log('Server running'));