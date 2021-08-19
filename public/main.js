const divSelectRoom    = document.getElementById("selectRoom");
const inputRoomNumber  = document.getElementById("roomNumber");
const btnGoRoom        = document.getElementById("goRoom");

const divConsultingRoom = document.getElementById("consultingRoom");
const localVideo        = document.getElementById("localVideo");
const remoteVideo       = document.getElementById("remoteVideo");

let roomNumber, localStream, remoteStream, rtcPeerConnection, isCaller;


const iceServers = {
    isceServer: [
        /**
         * We can use below server for free but it's not recommended to use it in the production.
         * In such case you need to setup your own STUN and TURN server.
         */
        {urls: "stun:stun.services.mozilla.com"},
        {urls: "stun:stun.l.google.com.19302"},
    ]
}

const streamConstraints = {
    video: true,
    audio: true,
}

const getUserMedia = async () => {
    
    try {
        const stream = await navigator.mediaDevices.getUserMedia(streamConstraints);
        localStream = stream;
        localVideo.srcObject = stream;

    } catch(error) {
        console.log("Error occoured while [getUserMedia] = ", error);
        alert(error);
    }
}// End of getUserMedia method

const socket = io();


btnGoRoom.onclick = () => {
    roomNumber = inputRoomNumber.value;

    if(!roomNumber) return alert("Please type a room number");

    socket.emit("create or join", roomNumber);

    divSelectRoom.style = "display:none";
    divConsultingRoom.style = "display:block";
}

socket.on("created", room => {
    getUserMedia()
        .then(_ => {
            isCaller = true;
        });
});


socket.on("joined", room => {
    getUserMedia()
        .then(_ => {
            isCaller = false;
            socket.emit("ready", roomNumber);
        });
});


// Creating an offer
socket.on("ready", () => {
    
    if(!isCaller) return;

    console.log("Sending or crating an offer.");

    rtcPeerConnection = new RTCPeerConnection(iceServers);
    // So every time a new ICE candidate found, onicecandidate event is trigged or fire.
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddRemoteStream;

    const tracks = localStream.getTracks();
    console.log("isCaller [getTracks]", tracks);
    const [videoTrack, audioTrack] = tracks;
    console.log("videoTrack =", videoTrack, "audioTrack =", audioTrack);

    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    if(audioTrack) rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);

    // Creating offer
    rtcPeerConnection.createOffer()
        .then(sessionDescriptionProtocal => {
            rtcPeerConnection.setLocalDescription(sessionDescriptionProtocal);

            // So it can be sent to other user
            socket.emit("offer", {
                type: "offer",
                sdp : sessionDescriptionProtocal,
                room: roomNumber,
            });
        })
        .catch(error => {
            console.log("[isCaller] Error occured while sending or creating an offer");
            alert(error);
        })

});



// Creating an answer
socket.on("offer", sdp => {

    if(isCaller) return;
    console.log("Sending or answering to an offer get by caller or user or sender.");

    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.ontrack = onAddRemoteStream;
    rtcPeerConnection.setRemoteDescription( new RTCSessionDescription(sdp) );

    const tracks = localStream.getTracks();
    console.log("not isCaller [getTracks]", tracks);
    const [videoTrack, audioTrack] = tracks;
    console.log("videoTrack =", videoTrack, "audioTrack =", audioTrack);

    rtcPeerConnection.addTrack(localStream.getTracks()[0], localStream);
    if(audioTrack) rtcPeerConnection.addTrack(localStream.getTracks()[1], localStream);

    // Creating offer
    rtcPeerConnection.createAnswer()
        .then(sessionDescriptionProtocal => {
            rtcPeerConnection.setLocalDescription(sessionDescriptionProtocal);

            // So it can be sent to other user
            socket.emit("answer", {
                type: "answer",
                sdp : sessionDescriptionProtocal,
                room: roomNumber,
            });
        })
        .catch(error => {
            console.log("[not isCaller] Error occured while sending an answer");
            alert(error);
        })

});


// Responding to an answer
socket.on("answer", sdp => {
    console.log("[isCaller] got answer from the receiver");
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
});


socket.on("candidate", event => {
    const candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate,
    });

    rtcPeerConnection.addIceCandidate(candidate);

});



const onAddRemoteStream = (receivedRemoteStream) => {
    // So every RTCPeerConnection receive a remote stream it will trigged or fire ontrack event.

    console.log("[onAddRemoteStream] received receivedRemoteStream", receivedRemoteStream);
    remoteVideo.srcObject = receivedRemoteStream[0];
    remoteStream = receivedRemoteStream;
}


/**
 * For ICE candidate we to identify two process, Sending and receiving.
 * ICE framework follows a process that consists in 3 steps.
 *  1) Getting a devices IP address
 *  2) Using STUN server or TURN server
 */
const onIceCandidate = (event) => {
    
    console.log("[onIceCandidate] received new ice candidate", event);
    
    if(event.candidate) {
        socket.emit("candidate", {
            type: "candidate",
            label: event.candidate.sdpMLineIndex, //These are some values, that are handled internally by the ICE framework
            id: event.candidate.sdpMLineIndex,
            candidate: event.candidate.candidate,
            room: roomNumber
        });
    }

}
