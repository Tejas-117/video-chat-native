// global variables
const localVideo = document.querySelector('#local_video');
const remoteVideo = document.querySelector('#peer_video');
const hangUpBtn = document.querySelector('#hangup-button');

let stunServers = [
   "stun:stun1.l.google.com:19302",
   "stun:stun2.l.google.com:19302",
];

const RTCconfig = {
   iceServers: [{ urls: stunServers }],
   iceCandidatePoolSize: 10
};

const mediaConstraints = {
   audio: true,
   video: true
}

let myPeerConnection = null;
let targetId = '';

// function to communicate with 'signaling server'
function sendToServer(message){
   socket.emit('client-message', message);
}

socket.on('server-message', receiveFromServer);
function receiveFromServer(message, type){
   switch (type){
      case 0: handleVideoOfferMsg(message); 
              break;
      case 1: handleVideoAnswerMsg(message); 
              break;
      case 2: handleNewICECandidateMsg(message); 
              break;
      case 3: {
         console.log('Peer end the call');
         closeVideoCall(); 
              break;
      }
   }
}

function createPeerConnection(){
   myPeerConnection = new RTCPeerConnection(RTCconfig);

   myPeerConnection.onicecandidate = handleICECandidateEvent;
   myPeerConnection.ontrack = handleTrackEvent;
   myPeerConnection.onnegotiationneeded = handleNegotiationNeeded;
   myPeerConnection.onremovetrack = handleRemoveTrackEvent;
   myPeerConnection.oniceconnectionstatechange = handleICEConnectionStateChangeEvent;
   myPeerConnection.onsignalingstatechange = handleSignalingStateChangeEvent;
}

// starting point
async function start(e){
   let localStream = null;
   targetId = e.target.dataset.socketid;
   
   if(myPeerConnection){
      alert("Already in call");
      return;
   }
   if(id === targetId){
      alert("Can not speak with yourself")
      return;
   }
   
   // [1].start peer connection
   createPeerConnection();
   
   // [2] get user devices and their media
   try {
      localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localVideo.srcObject = localStream;
      localStream.getTracks().forEach(track => {
         myPeerConnection.addTrack(track, localStream);
      })
   } catch (error) {
      handleUserMediaErr(error);
   }
}

function handleGetUserMediaError(e) {
   switch(e.name) {
     case "NotFoundError":
       alert("Unable to open your call because no camera and/or microphone" +
             "were found.");
       break;
     case "SecurityError":
     case "PermissionDeniedError":
       break;
     default:
       alert("Error opening your camera and/or microphone: " + e.message);
       break;
   }
 
   closeVideoCall();
 }
 
// [3] handling negotiation and create offer
async function handleNegotiationNeeded(){
   const offer = await myPeerConnection.createOffer();
   await myPeerConnection.setLocalDescription(offer);

   sendToServer({
      from: id,
      target: targetId,
      type: 'video-offer',
      sdp: myPeerConnection.localDescription
   })
}

// handle video offer from other peer (happens in callee)
async function handleVideoOfferMsg(message){
   targetId = message.from;
   let localStream = null;
   
   if(!myPeerConnection){
      createPeerConnection();
   }

   // create Session Description using recieved SDP
   const desc = new RTCSessionDescription(message.sdp);

   try {
      await myPeerConnection.setRemoteDescription(desc);

      localStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      localVideo.srcObject = localStream;
      localStream.getTracks().forEach(track => {
         myPeerConnection.addTrack(track, localStream);
      })

      const answer = await myPeerConnection.createAnswer(); // gives the sdp
      await myPeerConnection.setLocalDescription(answer); // set localDescription as sdp

      sendToServer({
         from: id,
         target: targetId,
         type: 'video-answer',
         sdp: myPeerConnection.localDescription
      })
   } catch (error) {
      console.log('Something went wrong in handling video offer..');
      console.log(error);
   }   
}

// [4] handle the answer from other peer
async function handleVideoAnswerMsg(message){
   const desc = new RTCSessionDescription(message.sdp);
   await myPeerConnection.setRemoteDescription(desc).catch(err => console.log(err));
}

// Other util functions
function handleTrackEvent(event){
   remoteVideo.srcObject = event.streams[0];
   hangUpBtn.disabled = false;
}

function handleRemoveTrackEvent(event) {
   const stream = remoteVideo.srcObject;
   const trackList = stream.getTracks();
 
   if (trackList.length == 0) {
     closeVideoCall();
   }
}
 
function hangUpCall() {
   sendToServer({
      id: id,
      target: targetId,
      type: "hang-up"
   });

   closeVideoCall();
 }

function closeVideoCall() { 
   if (myPeerConnection) {
     myPeerConnection.ontrack = null;
     myPeerConnection.onremovetrack = null;
     myPeerConnection.onremovestream = null;
     myPeerConnection.onicecandidate = null;
     myPeerConnection.oniceconnectionstatechange = null;
     myPeerConnection.onsignalingstatechange = null;
     myPeerConnection.onnegotiationneeded = null;
 
     if (remoteVideo.srcObject) {
       remoteVideo.srcObject.getTracks().forEach(track => track.stop());
     }
 
     if (localVideo.srcObject) {
       localVideo.srcObject.getTracks().forEach(track => track.stop());
     }
 
     myPeerConnection.close();
     myPeerConnection = null;
   }
 
   remoteVideo.removeAttribute("src");
   remoteVideo.removeAttribute("srcObject");
   localVideo.removeAttribute("src");
   remoteVideo.removeAttribute("srcObject");
 
   hangUpBtn.disabled = true;
   targetId = null;
 }
 

/////////////////////////////// ICE candidate event handlers //////////////////////////////
function handleICECandidateEvent(event){
   // event contains candidate property which contains SDP.
   if(event.candidate){
      sendToServer({
         target: targetId, // where the ice candidate should be delivered.
         type: 'new-ice-candidate',
         candidate: event.candidate // the SDP should be transmitted to other user.
      })
   }
}

// receive ice candidates;
function handleNewICECandidateMsg(msg){
   // construct ice candidate from received SDP;
  const candidate = new RTCIceCandidate(msg.candidate);

   // add ice candidate to ICE layer;
  myPeerConnection.addIceCandidate(candidate).catch(err => console.log(err));
}

function handleICEConnectionStateChangeEvent(event) {
   switch(myPeerConnection.iceConnectionState) {
     case "closed":
     case "failed":
       closeVideoCall();
       break;
   }
 }
 
 function handleSignalingStateChangeEvent(event) {
   switch(myPeerConnection.signalingState) {
     case "closed":
       closeVideoCall();
       break;
   }
 }; 