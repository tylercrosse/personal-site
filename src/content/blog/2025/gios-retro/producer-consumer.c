#include <pthread.h>
#include <stdio.h>
#include <unistd.h>

// Shared resources protected by a mutex
pthread_mutex_t lock = PTHREAD_MUTEX_INITIALIZER;
pthread_cond_t cond = PTHREAD_COND_INITIALIZER;
int message_ready = 0;

// Consumer thread waits for a condition
void *consumer(void *arg) {
  pthread_mutex_lock(&lock);
  // Use a while loop to protect against spurious wakeups
  while (message_ready == 0) {
    printf("Consumer: Waiting for message...\n");
    // Unlocks the mutex and waits; re-acquires lock upon wakeup
    pthread_cond_wait(&cond, &lock);
  }
  printf("Consumer: Message received!\n");
  pthread_mutex_unlock(&lock);
  return NULL;
}

// Producer thread signals the condition
void *producer(void *arg) {
  // sleep(1) helps ensure the consumer runs first and waits
  sleep(1);

  pthread_mutex_lock(&lock);
  printf("Producer: Preparing message...\n");
  message_ready = 1;
  // Wakes up one waiting thread
  pthread_cond_signal(&cond);
  printf("Producer: Message sent!\n");
  pthread_mutex_unlock(&lock);
  return NULL;
}

int main() {
  pthread_t producer_thread, consumer_thread;

  // Create the two threads
  pthread_create(&consumer_thread, NULL, consumer, NULL);
  pthread_create(&producer_thread, NULL, producer, NULL);

  // Wait for both threads to complete
  pthread_join(producer_thread, NULL);
  pthread_join(consumer_thread, NULL);

  printf("Producer and consumer have finished.\n");
  return 0;
}