import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc } from '@angular/fire/firestore';

interface Task {
  id?: string;
  name: string;
  description: string;
  done: boolean;
  category: string;
  deadline?: string;
  notification?: boolean;         
  reminders?: string[];           
  notifiedReminders?: string[];    
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  title = 'checklist-app';
  tasks: Task[] = [];
  currentCategory: string = 'All';
  editTaskIndex: number | null = null;
  categories = ['All', 'Personal', 'Work'];

  modalTask = {
    name: '',
    description: '',
    deadline: '',
    reminders: [] as string[],
  };

  isModalOpen = false;
  isDarkMode = false;
  selectedTasks: Set<string> = new Set();

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    this.loadTasks();
    this.requestNotificationPermission();
    this.startDueTaskChecker();
  }

  isPastDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr + 'T00:00:00');
  return date.getTime() < today.getTime();
}

isPastDateTime(dateTimeStr: string): boolean {
  if (!dateTimeStr) return false;
  const now = new Date();
  const dateTime = new Date(dateTimeStr);
  return dateTime.getTime() < now.getTime();
}


  loadTasks(): void {
    const tasksCollection = collection(this.firestore, 'tasks');
    collectionData(tasksCollection, { idField: 'id' }).subscribe((data) => {
      this.tasks = data as Task[];
      this.selectedTasks.clear();

      this.tasks.forEach(task => {
        if (task.reminders && task.notifiedReminders) {
          task.notification = task.reminders.length === task.notifiedReminders.length;
        } else {
          task.notification = false; 
        }
      });
    });
  }

  showModal(editIndex: number | null = null): void {
    if (editIndex === null && this.currentCategory === 'All') {
      alert(`Please select either 'Personal' or 'Work' tab to add a new task.`);
      return;
    }
    this.isModalOpen = true;
    if (editIndex !== null) {
      this.editTaskIndex = editIndex;
      const task = this.tasks[editIndex];
      this.modalTask = {
        name: task.name,
        description: task.description,
        deadline: task.deadline || '',
        reminders: task.reminders ? [...task.reminders] : [],
      };
    } else {
      this.editTaskIndex = null;
      this.modalTask = { name: '', description: '', deadline: '', reminders: [] };
    }
  }

  closeModal(): void {
    this.isModalOpen = false;
  }

async submitTask(): Promise<void> {
  const name = this.modalTask.name.trim();
  const description = this.modalTask.description || '';
  const deadline = this.modalTask.deadline || '';

  if (!name && !deadline) {      
    alert("Please enter both a 'Task Title' and a 'Deadline'.");
    return;
  }

  if (!name) {
    alert("Please enter a 'Task Title'.");
    return;
  }
  if (!deadline) {
    alert("Please enter a 'Deadline'.");
    return;
  }

  if (!this.modalTask.reminders || this.modalTask.reminders.length === 0) {
    alert('Please add at least one reminder for the task.');
    return;
  }

  if (this.isPastDate(deadline)) {
    alert('Deadline cannot be in the past.');
    return;
  }

  for (const rem of this.modalTask.reminders) {
    if (this.isPastDateTime(rem)) {
      alert('Reminder times cannot be in the past.');
      return;
    }
  }

  this.modalTask.reminders = this.modalTask.reminders.filter(
    dt => dt && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(dt)
  );

  const newTask: Omit<Task, 'id'> = {
    name,
    description,
    done: false,
    category: this.currentCategory === 'All' ? 'Personal' : this.currentCategory,
    deadline,
    reminders: this.modalTask.reminders,
    notifiedReminders: [],
    notification: false,
  };

  try {
    if (this.editTaskIndex !== null) {
      const task = this.tasks[this.editTaskIndex];
      const taskRef = doc(this.firestore, `tasks/${task.id}`);
      await updateDoc(taskRef, newTask as any);
    } else {
      const tasksCollection = collection(this.firestore, 'tasks');
      await addDoc(tasksCollection, newTask);
    }
  } catch (error) {
    console.error('Error saving task:', error);
  }

  this.closeModal();
}


  async toggleTask(index: number): Promise<void> {
    const task = this.tasks[index];
    const taskRef = doc(this.firestore, `tasks/${task.id}`);
    await updateDoc(taskRef, { done: !task.done });
  }

  async deleteTask(task: Task): Promise<void> {
    if (!task) return;

    const confirmDelete = confirm(
      `Are you sure you want to delete the task "${task.name}"?\nOnce deleted, this action cannot be undone.`
    );
    if (!confirmDelete) return;

    if (task.id) {
      const taskRef = doc(this.firestore, `tasks/${task.id}`);
      await deleteDoc(taskRef);
    }
  }

  switchCategory(category: string): void {
    this.currentCategory = category;
    this.selectedTasks.clear();
  }

  filteredTasks(): Task[] {
    if (this.currentCategory === 'All') return this.tasks;
    return this.tasks.filter((task) => task.category === this.currentCategory);
  }

  toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  isDueToday(deadline: string): boolean {
    const today = new Date();
    const d = new Date(deadline + 'T23:59:59');
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth() === today.getMonth() &&
      d.getDate() === today.getDate()
    );
  }

  isOverdue(deadline: string): boolean {
    const now = new Date();
    const d = new Date(deadline + 'T23:59:59');
    return d.getTime() < now.getTime();
  }

  isPastDeadline(deadline: string): boolean {
    const now = new Date();
    const d = new Date(deadline + 'T23:59:59');
    return d.getTime() < now.getTime();
  }

  toggleTaskSelection(taskId: string | undefined): void {
    if (!taskId) return;
    if (this.selectedTasks.has(taskId)) {
      this.selectedTasks.delete(taskId);
    } else {
      this.selectedTasks.add(taskId);
    }
  }

  toggleSelectAll(checked: boolean): void {
    if (checked) {
      this.filteredTasks().forEach((task) => {
        if (task.id) this.selectedTasks.add(task.id);
      });
    } else {
      this.filteredTasks().forEach((task) => {
        if (task.id) this.selectedTasks.delete(task.id);
      });
    }
  }

  allSelected(): boolean {
    const filtered = this.filteredTasks().filter((t) => t.id);
    return filtered.length > 0 && filtered.every((task) => this.selectedTasks.has(task.id!));
  }

  async deleteAllSelectedTasks(): Promise<void> {
    if (this.selectedTasks.size === 0) return;

    const confirmDelete = confirm(
      'Are you sure you want to delete the selected tasks?\nOnce deleted, this action cannot be undone.'
    );
    if (!confirmDelete) return;

    const deletePromises = Array.from(this.selectedTasks).map((taskId) => {
      const taskRef = doc(this.firestore, `tasks/${taskId}`);
      return deleteDoc(taskRef);
    });

    await Promise.all(deletePromises);
    this.selectedTasks.clear();
  }


  addReminder(datetime: string): void {
    if (!datetime) return;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetime)) {
      alert('Invalid datetime format. Please select a correct date and time.');
      return;
    }
    if (this.modalTask.reminders.includes(datetime)) {
      alert('Reminder datetime already added.');
      return;
    }
    this.modalTask.reminders.push(datetime);
  }

  requestNotificationPermission() {
    if ('Notification' in window) {
      Notification.requestPermission();
    }
  }

get minDate(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = ('0' + (today.getMonth() + 1)).slice(-2);
  const d = ('0' + today.getDate()).slice(-2);
  return `${y}-${m}-${d}`;
}

get minDateTime(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = ('0' + (now.getMonth() + 1)).slice(-2);
  const d = ('0' + now.getDate()).slice(-2);
  const h = ('0' + now.getHours()).slice(-2);
  const min = ('0' + now.getMinutes()).slice(-2);
  return `${y}-${m}-${d}T${h}:${min}`;
}

startDueTaskChecker() {
  setInterval(() => {
    const now = new Date();

    this.tasks.forEach(async (task) => {
      if (!task.done && task.deadline && this.isPastDeadline(task.deadline)) {
        task.done = true;
        task.notification = true;

        if (task.id) {
          const taskRef = doc(this.firestore, `tasks/${task.id}`);
          await updateDoc(taskRef, {
            done: true,
            notification: true,
          });
        }
      }

      if (task.done) return; 
      if (!task.reminders?.length) return;

      if (!task.notifiedReminders) task.notifiedReminders = [];

      for (const reminderStr of task.reminders) {
        if (task.notifiedReminders.includes(reminderStr)) continue;

        const reminderDate = new Date(reminderStr);
        const diffMs = now.getTime() - reminderDate.getTime();

        if (diffMs >= 0 && diffMs < 60000) {
          this.sendDueNotification(task);
          task.notifiedReminders.push(reminderStr);

          const allNotified = this.areAllRemindersNotified(task);
          if (allNotified) {
            task.done = true;
            task.notification = true;
          }

          if (task.id) {
            const taskRef = doc(this.firestore, `tasks/${task.id}`);
            await updateDoc(taskRef, {
              notifiedReminders: task.notifiedReminders,
              done: task.done,
              notification: task.notification,
            });
          }
          break; 
        }
      }
    });
  }, 15000); 
}

  sendDueNotification(task: Task) {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Reminder: ${task.name}`, {
        body: task.description || 'You have a task reminder!',
        icon: 'assets/bell.png',
      });
    }
  }

  areAllRemindersNotified(task: Task): boolean {
  if (!task.reminders || task.reminders.length === 0) {
    return task.done || false;
  }
  if (!task.notifiedReminders) return false;
  return task.reminders.every(reminder => task.notifiedReminders?.includes(reminder));
}

  async toggleReminder(task: Task): Promise<void> {
    if (!task.notifiedReminders) task.notifiedReminders = [];
    if (!task.reminders) task.reminders = [];

    if (task.notification) {
      task.notifiedReminders = [];
      task.notification = false;
    } else {
      task.notifiedReminders = [...task.reminders];
      task.notification = true;
    }

    if (task.id) {
      const taskRef = doc(this.firestore, `tasks/${task.id}`);
      await updateDoc(taskRef, {
        notifiedReminders: task.notifiedReminders,
        notification: task.notification,
      });
    }
  }
}
