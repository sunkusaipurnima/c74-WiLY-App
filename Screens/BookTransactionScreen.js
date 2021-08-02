/** @format */

import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  TextInput,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  ToastAndroid,
  Alert,
} from "react-native";
import { Rajdhani_600SemiBold } from "@expo-google-fonts/rajdhani";
import { BarCodeScanner } from "expo-barcode-scanner";
import db from "../config";
import * as firebase from "firebase";

const bgImg = require("../assets/background2.png");
const appIcon = require("../assets/appIcon.png");
const appName = require("../assets/appName.png");

const BookTransactionScreen = (props) => {
  const [hasPermissions, setHasPermissions] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanStudentId, setScanStudentId] = useState("normal");
  const [scanBookId, setScanBookId] = useState("normal");
  const [studentId, setstudentId] = useState(null);
  const [bookId, setbookId] = useState(null);
  // const [submitState, setSubmitState] = useState("normal");
  // const [returnState, setReturnState] = useState("normal");

  const handleTransactions = async (state) => {
    console.log("inside handle transactions", state);
    // Getting book details with the bookId
    var bookDetails, studentDetails, lastTransaction;
    var bookDetailsRef = await db.collection("books").doc(bookId).get();
    if (bookDetailsRef) {
      bookDetails = await bookDetailsRef.data();
    } else {
      Alert.alert("Book does not exist in database");
    }

    // Getting student details from firestore using studentId
    var studentDetailsRef = await db
      .collection("students")
      .doc(studentId)
      .get();
    if (studentDetailsRef) {
      studentDetails = await studentDetailsRef.data();
    } else {
      Alert.alert("Student Id does not exist in database");
    }

    console.log("bookDetails,studentDetails", bookDetails, studentDetails);

    if (state === "submitClicked") {
      console.log("inside submit state clicked");
      if (studentDetails.number_of_books_issued < 2) {
        console.log("condition satified");
        initiateBookIssue(bookDetails.book_name, studentDetails.student_name);
      } else Alert.alert("Exceeds student Limit,so cant issue the book");
    } else if (state === "returnClicked") {
      console.log("inside return clicked ");

      initiateBookReturn(bookDetails.book_name, studentDetails.student_name);
    }
  };

  const initiateBookReturn = async (bookName, studentName) => {
    // Getting the last transaction details based on bookId and studentId
    var lastTransaction;
    await db
      .collection("transactions")
      .where("book_id", "==", bookId)
      .where("student_id", "==", studentId)
      .limit(1)
      .get()
      .then((querySnapshot) => {
        querySnapshot.forEach((doc) => {
          //console.log("document", doc.data());
          lastTransaction = doc.data();
        });
      })
      .catch(() => {
        console.log("error while getting last transaction", error);
        Alert.alert("Book is issued to another student");
      });

    //console.log("lastTransaction", lastTransaction.student_id);

    if (lastTransaction) {
      console.log("return condition satisfied");
      await db
        .collection("transactions")
        .add({
          student_id: studentId,
          book_id: bookId,
          book_name: bookName,
          student_name: studentName,
          date: firebase.firestore.FieldValue.serverTimestamp(),
          transaction_type: "return",
        })
        .then((docRef) => {
          console.log("Book Return Transaction written with ID: ", docRef.id);
          Alert.alert("Book Returned Successfully");
        })
        .catch((error) => {
          console.error(
            "Error adding transaction document while returning book: ",
            error
          );
        });
      //change the book availability status
      await db
        .collection("books")
        .doc(bookId)
        .update({ is_book_available: true })
        .then(() => {
          console.log(
            "Book Availability successfully updated while Issuing the book!"
          );
        })
        .catch((error) => {
          // The document probably doesn't exist.
          console.error(
            "Error updating book document while returning the book: ",
            error
          );
        });

      // change number of books issued to the student

      await db
        .collection("students")
        .doc(studentId)
        .update({
          number_of_books_issued: firebase.firestore.FieldValue.increment(-1),
        })
        .then(() => {
          console.log(
            "Number of books issued  successfully updated,after returning the book!"
          );
        })
        .catch((error) => {
          console.error(
            "Error updating Student document while returning the book ",
            error
          );
        })
        .finally(() => {
          setstudentId("");
          setbookId("");
        });
    } else {
      Alert.alert("Book is issued to another student");
    }
  };

  const initiateBookIssue = (bookName, studentName) => {
    console.log("inside initiate book issue");
    db.collection("transactions")
      .add({
        student_id: studentId,
        book_id: bookId,
        book_name: bookName,
        student_name: studentName,
        date: firebase.firestore.FieldValue.serverTimestamp(),
        transaction_type: "issue",
      })
      .then((docRef) => {
        console.log("Book Issue Document written with ID: ", docRef.id);
        Alert.alert("Book Issued Successfully");
      })
      .catch((error) => {
        console.error("Error adding document while issuing book: ", error);
      });

    //change the book availability status
    db.collection("books")
      .doc(bookId)
      .update({ is_book_available: false })
      .then(() => {
        console.log(
          "Book Availability successfully updated while Issuing the book!"
        );
      })
      .catch((error) => {
        // The document probably doesn't exist.
        console.error(
          "Error updating book document while issuing the book: ",
          error
        );
      });

    // change number of books issued to the student

    db.collection("students")
      .doc(studentId)
      .update({
        number_of_books_issued: firebase.firestore.FieldValue.increment(1),
      })
      .then(() => {
        console.log(
          "Number of books issued  successfully updated,after issuing the book!"
        );
      })
      .catch((error) => {
        // The document probably doesn't exist.
        console.error(
          "Error updating Student document while issuing the book ",
          error
        );
      })
      .finally(() => {
        setstudentId("");
        setbookId("");
      });
  };

  const handlePermissions = async () => {
    const { status } = await BarCodeScanner.requestPermissionsAsync();
    setHasPermissions(status === "granted");
    setScanned(false);
  };

  const handleScan = async ({ type, data }) => {
    console.log("inside handle scan");
    if (scanBookId === "clicked") {
      setbookId(data);
      setScanned(true);
      setScanBookId("normal");
    } else if (scanStudentId === "clicked") {
      setstudentId(data);
      setScanned(true);
      setScanStudentId("normal");
    }
  };

  if (
    (scanBookId === "clicked" || scanStudentId === "clicked") &&
    hasPermissions
  ) {
    console.log("inside bar code scanner");
    console.log("scanned is", scanned);
    return (
      <BarCodeScanner
        onBarCodeScanned={scanned ? undefined : handleScan}
        style={StyleSheet.absoluteFillObject}
      />
    );
  }

  return (
    <ImageBackground source={bgImg} style={styles.bgImage}>
      <View style={styles.upperContainer}>
        <Image source={appIcon} style={styles.appIcon} />
        <Image source={appName} style={styles.appName} />
      </View>
      <View style={styles.lowerContainer}>
        <View style={styles.textInputContainer}>
          <TextInput
            style={styles.textInput}
            placeholder="Book Id"
            placeholderTextColor="#ffff"
            onChangeText={(text) => {
              setbookId(text);
            }}
            value={bookId}
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => {
              setScanBookId("clicked");
              handlePermissions();
            }}
          >
            <Text style={styles.scanButtonText}> Scan</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.textInputContainer, { marginTop: 20 }]}>
          <TextInput
            style={styles.textInput}
            placeholder="Student Id"
            placeholderTextColor="#ffff"
            onChangeText={(text) => {
              setstudentId(text);
            }}
            value={studentId}
          />
          <TouchableOpacity
            style={styles.scanButton}
            onPress={() => {
              setScanStudentId("clicked");
              handlePermissions();
            }}
          >
            <Text style={styles.scanButtonText}> Scan</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            //setSubmitState("clicked");
            handleTransactions("submitClicked");
          }}
        >
          <Text style={styles.submitButtonText}>Issue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => {
            //setReturnState("clicked");
            handleTransactions("returnClicked");
          }}
        >
          <Text style={styles.submitButtonText}>Return</Text>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  appIcon: {
    width: 200,
    height: 200,
    resizeMode: "contain",
    marginTop: 80,
  },
  appName: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  bgImage: {
    flex: 1,
    resizeMode: "cover",
    justifyContent: "center",
  },
  buttonsContainer: { flexDirection: "row", justifyContent: "space-evenly" },

  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  lowerContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButton: {
    width: 100,
    height: 50,
    backgroundColor: "#9DFD24",
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  scanButtonText: {
    fontSize: 24,
    fontFamily: "Rajdhani_600SemiBold",
    color: "#0A0101",
  },
  submitButton: {
    width: "43%",
    height: 55,
    backgroundColor: "#f4d820",
    justifyContent: "center",
    alignSelf: "center",
    borderRadius: 15,
    marginBottom: 50,
  },
  submitButtonText: {
    fontSize: 24,
    color: "#fff",
    fontFamily: "Rajdhani_600SemiBold",
    textAlign: "center",
  },

  textInputContainer: {
    borderWidth: 2,
    borderRadius: 10,
    flexDirection: "row",
    backgroundColor: "#9DFD24",
    borderColor: "#FFFFFF",
  },
  textInput: {
    width: "57%",
    height: 50,
    padding: 10,
    borderColor: "#fff",
    justifyContent: "center",
    borderTopLeftRadius: 10,
    borderBottomLeftRadius: 10,
    fontSize: 18,
    backgroundColor: "#5653d4",
    fontFamily: "Rajdhani_600SemiBold",
    color: "#fff",
  },
  upperContainer: {
    flex: 0.5,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default BookTransactionScreen;
