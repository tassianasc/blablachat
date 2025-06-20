import firebase from "firebase";
import 'firebase/database';
import 'firebase/storage'; 

// PREENCHA CORRETAMENTE
const firebaseConfig = {
  apiKey: "",
  authDomain: "",
  databaseURL: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: "",
  measurementId: ""
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
   
export const auth = firebase.auth();
export const database = firebase.database();
export const storage = firebase.storage();