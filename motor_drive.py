import sys
import time
import RPi.GPIO as GPIO

mode = GPIO.getmode()

Forward=16
Backward=15

GPIO.setmode(GPIO.BOARD)
GPIO.setup(Forward, GPIO.OUT)
GPIO.setup(Backward, GPIO.OUT)

def forward():
  GPIO.output(Backward, GPIO.LOW)
  GPIO.output(Forward, GPIO.HIGH)
  print("Motor forward")


def backward():
  GPIO.output(Forward, GPIO.LOW)
  GPIO.output(Backward, GPIO.HIGH)
  print("Motor backward")



forward()
time.sleep(5)
backward()
time.sleep(5)
GPIO.cleanup()
