import { Component, OnInit } from '@angular/core';
import { Firestore, collection, collectionData, addDoc, updateDoc, deleteDoc, doc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';

interface Task {
  id?: string;
  name: string;
  description: string;
  done: boolean;
  category: string;
  deadline?: string;
  notified?: boolean;
  reminderDismissed?: boolean;
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

  modalTask: { name: string; description: string; deadline: string } = {
    name: '',
    description: '',
    deadline: '',
  };

  isModalOpen = false;
  isDarkMode = false;
  
  //For quick input
  quickTaskName: string='';

  //For checkbox selection
  selectedTasks: Set<string> = new Set();
  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    this.loadTasks();
    this.requestNotificationPermission();
    this.startDueTaskChecker();
  }

  loadTasks(): void {
    const tasksCollection = collection(this.firestore, 'tasks');
    collectionData(tasksCollection, { idField: 'id' }).subscribe((data) => {
      this.tasks = data as Task[];
      this.selectedTasks.clear();
    });
  }

  showModal(editIndex: number | null = null): void {

    if (editIndex === null && this.currentCategory === "All") {
      alert("Please select either 'Personal' or 'Work' tab to add a new task.");
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
      };
    } else {
      this.editTaskIndex = null;
      this.modalTask = { name: '', description: '', deadline: '' };
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
      } else if (!name) {
        alert("Please enter a 'Task Title'.");
        return;
      } else if (!deadline) {
        alert("Please enter a 'Deadline'.");
        return;
      }

    const newTask: Omit<Task, 'id'> = {
      name,
      description,
      done: false,
      category: this.currentCategory === 'All' ? 'Personal' : this.currentCategory,
      deadline,
    };

    if (this.editTaskIndex !== null) {
      const task = this.tasks[this.editTaskIndex];
      const taskRef = doc(this.firestore, `tasks/${task.id}`);
      await updateDoc(taskRef, newTask as any);
    } else {
      const tasksCollection = collection(this.firestore, 'tasks');
      await addDoc(tasksCollection, newTask);
    }

    this.closeModal();
  }

  async quickAddTask(): Promise<void> {
    const name = this.quickTaskName.trim();
    if(!name) return;
    if(this.currentCategory === "All") {
      alert("Please select 'Personal' or 'Work' to add a new task.");
      return;
    }
    const newTask: Omit<Task, 'id'> ={
      name,
      description: '',
      done: false,
      category: this.currentCategory,
      deadline: '',
    };
    const tasksCollection= collection(this.firestore, 'tasks');
    await addDoc(tasksCollection, newTask);
    this.quickTaskName = '';
  }
  async toggleTask(index: number): Promise<void> {
    const task = this.tasks[index];
    const taskRef = doc(this.firestore, `tasks/${task.id}`);
    await updateDoc(taskRef, { done: !task.done });
  }

  async deleteTask(index: number): Promise<void> {
    const task = this.tasks[index];
    if (task.id) {
      const taskRef = doc(this.firestore, `tasks/${task.id}`);
      await deleteDoc(taskRef);
    }
  }

  switchCategory(category: string): void {
    this.currentCategory = category;
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
    const today = new Date();
    const d = new Date(deadline + 'T23:59:59');
    return d.getTime() < today.getTime();
  }

  editTask(index: number): void {
    this.showModal(index);
  }

  // Delete all selected tasks
  async deleteAllSelectedTasks(): Promise<void>{
    if (this.selectedTasks.size === 0) return;

    const confirmDelete = confirm('Are you sure want to delete all selected tasks?');
    if (!confirmDelete) return;

    const deletePromises = Array.from(this.selectedTasks).map(taskId => {
      const taskRef = doc(this.firestore, `tasks/${taskId}`);
      return deleteDoc(taskRef);
    });

    await Promise.all(deletePromises);
    this.selectedTasks.clear();
  }

  //Checkbox logic
  toggleTaskSelection(taskId: string | undefined): void{
    if (!taskId) return;
    if (this.selectedTasks.has(taskId)){
      this.selectedTasks.delete(taskId);
    }else{
      this.selectedTasks.add(taskId);
    }
  }

  toggleSelectAll(checked: boolean): void{
    if(checked){
      this.filteredTasks().forEach(task => {
        if (task.id) this.selectedTasks.add(task.id);
      });
    }else{
      this.filteredTasks().forEach(task =>{
        if (task.id) this.selectedTasks.delete(task.id);
      });
    }
  }

  allSelected(): boolean {
    const filtered = this.filteredTasks().filter(t => t.id);
    return filtered.length > 0 && filtered.every(task => this.selectedTasks.has(task.id!));
  }

/**
 * Notification Part
 * hehehe hai whoever reading this
 */
requestNotificationPermission() {
  if ('Notification' in window) {
    Notification.requestPermission();
  }
}

// Deadline Checker
startDueTaskChecker() {
  setInterval(() => {
    const now = new Date();
    this.tasks.forEach(task => {
      // Deadline notify
      if (task.deadline && !task.done && !task.notified) {
        const due = new Date(task.deadline + 'T23:59:59');
        if (now >= due) {
          this.sendDueNotification(task);
          task.notified = true;
        }
      }
    });
  }, 60 * 1000); // every 1 minute
}

// Show the notification
sendDueNotification(task: Task) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(`Task Due: ${task.name}`, {
      body: task.description || 'You have a task due!',
      icon: 'assets/bell.png'
    });
  }
}

// Dismiss
async dismissReminder(task: Task): Promise<void> {
  task.reminderDismissed = true;
  // Save logic, will stay even refresh
  if (task.id) {
    const taskRef = doc(this.firestore, `tasks/${task.id}`);
    await updateDoc(taskRef, { reminderDismissed: true });
  }
}


}
