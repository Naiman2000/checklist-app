import { Component, OnInit } from '@angular/core';

interface Task {
  name: string;
  description: string;
  done: boolean;
  category: string;
  deadline?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'], // adjust extension if you use css
})
export class AppComponent implements OnInit {
  title = 'checklist-app';

  tasks: Task[] = [];
  currentCategory = 'All';
  editTaskIndex: number | null = null;

  isModalOpen = false;

  modalTask: { name: string; description: string; deadline: string } = {
    name: '',
    description: '',
    deadline: '',
  };

  isDarkMode = false;

  categories = ['All', 'Personal', 'Work'];

  ngOnInit(): void {
    // Initially nothing to do or load
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

  submitTask(): void {
    const name = this.modalTask.name.trim();
    if (!name) return; // simple validation

    const description = this.modalTask.description || '';
    const deadline = this.modalTask.deadline || '';

    if (this.editTaskIndex !== null) {
      // Update existing task
      this.tasks[this.editTaskIndex] = {
        ...this.tasks[this.editTaskIndex],
        name,
        description,
        deadline,
      };
    } else {
      // Add new task with current category
      this.tasks.push({
        name,
        description,
        done: false,
        category: this.currentCategory === 'All' ? 'Personal' : this.currentCategory, // default category, avoid "All"
        deadline,
      });
    }
    this.closeModal();
  }

  toggleTask(index: number): void {
    this.tasks[index].done = !this.tasks[index].done;
  }

  deleteTask(index: number): void {
    this.tasks.splice(index, 1);
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
}
