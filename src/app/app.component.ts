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

  constructor(private firestore: Firestore) {}

  ngOnInit(): void {
    this.loadTasks();
  }

  loadTasks(): void {
    const tasksCollection = collection(this.firestore, 'tasks');
    collectionData(tasksCollection, { idField: 'id' }).subscribe((data) => {
      this.tasks = data as Task[];
    });
  }

  showModal(editIndex: number | null = null): void {
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
    if (!name) return;

    const description = this.modalTask.description || '';
    const deadline = this.modalTask.deadline || '';

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
}
