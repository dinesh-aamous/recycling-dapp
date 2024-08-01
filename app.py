from flask import Flask, render_template, Response
import cv2
import datetime
import mysql.connector
from mysql.connector import Error

app = Flask(__name__)

# Threshold and flags
thres = 0.50  # Detection threshold
is_detection_running = False  # Detection flag
detection_start_time = None  # Time when detection started
detection_window = 3  # Time window in seconds

# Database configuration
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'cretogroups'
}

# Open video capture
cap = cv2.VideoCapture(1)
cap.set(3, 1920)
cap.set(4, 1080)
cap.set(10, 70)

# Load class names
classNames = []
classFile = 'coco.names'
with open(classFile, 'rt') as f:
    classNames = f.read().rstrip('\n').split('\n')

# Load the pre-trained model
configPath = 'ssd_mobilenet_v3_large_coco_2020_01_14.pbtxt'
weightsPath = 'frozen_inference_graph.pb'
net = cv2.dnn_DetectionModel(weightsPath, configPath)
net.setInputSize(320, 320)
net.setInputScale(1.0 / 127.5)
net.setInputMean((127.5, 127.5, 127.5))
net.setInputSwapRB(True)

# Set of detected products and their timestamps
detected_products = {}

def insert_into_db(product_name):
    try:
        connection = mysql.connector.connect(**db_config)
        cursor = connection.cursor()
        query = "INSERT INTO product (product) VALUES (%s)"
        cursor.execute(query, (product_name,))
        connection.commit()
    except Error as e:
        print(f"Error: {e}")
    finally:
        if connection.is_connected():
            cursor.close()
            connection.close()

def detect_objects(frame):
    global is_detection_running, detection_start_time, detected_products
    
    # Check if the detection window has elapsed
    elapsed_time = (datetime.datetime.now() - detection_start_time).total_seconds()
    if elapsed_time >= detection_window:
        is_detection_running = False

    if is_detection_running:
        classIds, confs, bbox = net.detect(frame, confThreshold=thres)

        if classIds is not None:
            for classId, confidence, box in zip(classIds.flatten(), confs.flatten(), bbox):
                if 0 <= classId - 1 < len(classNames):
                    product_name = classNames[classId - 1]
                    current_time = datetime.datetime.now()

                    # Check if the product is in the detection window
                    if product_name not in detected_products or (current_time - detected_products[product_name]).total_seconds() >= detection_window:
                        # Insert into the database and update the detection time
                        insert_into_db(product_name)
                        detected_products[product_name] = current_time

                    cv2.rectangle(frame, box, color=(0, 255, 0), thickness=2)
                    cv2.putText(frame, product_name.upper(), (box[0] + 10, box[1] + 30),
                                cv2.FONT_HERSHEY_COMPLEX, 1, (0, 255, 0), 2)
                    cv2.putText(frame, str(round(confidence * 100, 2)), (box[0] + 200, box[1] + 30),
                                cv2.FONT_HERSHEY_COMPLEX, 1, (0, 255, 0), 2)

    return frame

def gen_frames():
    global is_detection_running, detection_start_time

    while True:
        success, frame = cap.read()
        if not success:
            break
        else:
            if is_detection_running:
                frame = detect_objects(frame)

            ret, buffer = cv2.imencode('.jpg', frame)
            frame = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/video_feed')
def video_feed():
    return Response(gen_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/start_detection', methods=['POST'])
def start_detection():
    global is_detection_running, detection_start_time
    is_detection_running = True
    detection_start_time = datetime.datetime.now()  # Record the start time
    detected_products.clear()  # Clear previously detected products
    return "Detection Started"

@app.route('/stop_detection', methods=['POST'])
def stop_detection():
    global is_detection_running
    is_detection_running = False
    return "Detection Stopped"

if __name__ == '__main__':
    app.run(debug=True)
