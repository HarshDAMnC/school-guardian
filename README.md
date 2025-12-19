# Attendance Management System (Fingerprint-Based)

A real-world Attendance Management System built for **Shree Swastika High School, Haliisa**, designed to automate student attendance using **fingerprint-based identification** integrated with a web application and backend server.

This project was developed as a **practical deployment-focused system**, keeping real school constraints and hardware testing in mind.

---

## 🏫 Problem Statement

Traditional attendance systems in schools are:
- Time-consuming
- Error-prone
- Easy to manipulate
- Hard to digitize reliably

The goal was to build a **simple, reliable, and scalable attendance system** using:
- Unique student identifiers (Fingerprint ID)
- Centralized backend
- Real-time attendance marking
- Minimal manual intervention

---

## 🚀 Solution Overview

The system uses a **Fingerprint Sensor + ESP32** to identify students and mark attendance automatically by communicating with a backend server.

### Workflow:
1. Student scans fingerprint on the hardware device
2. ESP32 extracts the fingerprint ID
3. ESP32 sends the ID to the backend via HTTP
4. Backend verifies the student and marks attendance
5. Hardware receives success/failure response instantly

---

## 🛠 Tech Stack

### Backend
- **Django**
- **Django REST Framework**
- SQLite / PostgreSQL
- REST APIs

### Frontend
- **React**
- Simple dashboard for managing students
- API-based data handling

### Hardware
- **ESP32**
- Fingerprint Sensor
- Arduino Framework
- Wi-Fi based HTTP communication

---

## 📂 Project Structure

