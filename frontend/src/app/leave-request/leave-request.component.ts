import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AttendanceService, CreateLeaveRequest } from '../services/attendance.service';

@Component({
  selector: 'app-leave-request',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="leave-request">
      <div class="page-header">
        <button (click)="goBack()" class="btn-back">
          ← 返回
        </button>
        <h2>请假申请</h2>
      </div>

      <div *ngIf="successMessage" class="success-alert">
        <span class="check-icon">✓</span>
        {{ successMessage }}
      </div>

      <div *ngIf="errorMessage" class="error-alert">
        <span class="error-icon">✕</span>
        {{ errorMessage }}
      </div>

      <div class="form-card card">
        <form (ngSubmit)="submitLeave()" #leaveForm="ngForm">
          <div class="form-group">
            <label for="leaveType">请假类型 <span class="required">*</span></label>
            <select 
              id="leaveType" 
              name="leaveType" 
              [(ngModel)]="leaveFormData.leave_type"
              required
              class="form-select"
              [class.invalid]="leaveType.invalid && leaveType.touched"
              #leaveType="ngModel"
            >
              <option value="" disabled>请选择请假类型</option>
              <option value="personal">事假</option>
              <option value="sick">病假</option>
              <option value="annual">年假</option>
            </select>
            <div *ngIf="leaveType.invalid && leaveType.touched" class="error-text">
              请选择请假类型
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label for="startDate">开始日期 <span class="required">*</span></label>
              <input 
                type="date" 
                id="startDate" 
                name="startDate" 
                [(ngModel)]="leaveFormData.start_date"
                (change)="calculateDays()"
                required
                [min]="today"
                class="form-input"
                [class.invalid]="startDate.invalid && startDate.touched"
                #startDate="ngModel"
              />
              <div *ngIf="startDate.invalid && startDate.touched" class="error-text">
                请选择开始日期
              </div>
            </div>

            <div class="form-group">
              <label for="endDate">结束日期 <span class="required">*</span></label>
              <input 
                type="date" 
                id="endDate" 
                name="endDate" 
                [(ngModel)]="leaveFormData.end_date"
                (change)="calculateDays()"
                required
                [min]="leaveFormData.start_date || today"
                class="form-input"
                [class.invalid]="endDate.invalid && endDate.touched"
                #endDate="ngModel"
              />
              <div *ngIf="endDate.invalid && endDate.touched" class="error-text">
                请选择结束日期
              </div>
            </div>
          </div>

          <div class="days-info" *ngIf="calculatedDays > 0">
            <div class="days-badge">
              <span class="days-number">{{ calculatedDays }}</span>
              <span class="days-label">工作日</span>
            </div>
            <p class="days-note">（已排除周末，实际请假天数）</p>
          </div>

          <div class="form-group">
            <label for="reason">请假事由 <span class="required">*</span></label>
            <textarea 
              id="reason" 
              name="reason" 
              [(ngModel)]="leaveFormData.reason"
              required
              rows="4"
              placeholder="请详细描述请假原因..."
              class="form-textarea"
              [class.invalid]="reason.invalid && reason.touched"
              #reason="ngModel"
            ></textarea>
            <div class="char-count">{{ leaveFormData.reason?.length || 0 }}/500</div>
            <div *ngIf="reason.invalid && reason.touched" class="error-text">
              请填写请假事由
            </div>
          </div>

          <div class="form-actions">
            <button type="button" (click)="goBack()" class="btn-secondary" [disabled]="submitting">
              取消
            </button>
            <button type="submit" class="btn-primary" [disabled]="submitting || !isFormValid()">
              {{ submitting ? '提交中...' : '提交申请' }}
            </button>
          </div>
        </form>
      </div>

      <div class="info-card card">
        <h3>请假须知</h3>
        <ul class="info-list">
          <li>请假日期自动排除周末，实际请假天数为工作日天数</li>
          <li>年假每人每年 10 天额度，超过额度将无法申请</li>
          <li>请假申请提交后需管理员审批，审批期间可查看状态</li>
          <li>请假日期不能与已批准的请假记录重叠</li>
          <li>审批通过后，请假期间的考勤状态将自动更新为"请假"</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .leave-request {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }
    .page-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .page-header h2 {
      margin: 0;
      color: #333;
      font-size: 1.5rem;
    }
    .btn-back {
      background: transparent;
      border: 1px solid #ddd;
      color: #666;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.875rem;
      transition: all 0.3s;
    }
    .btn-back:hover {
      background: #f5f5f5;
      border-color: #ccc;
    }
    .success-alert {
      background: #d4edda;
      color: #155724;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }
    .error-alert {
      background: #f8d7da;
      color: #721c24;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-weight: 500;
    }
    .check-icon, .error-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: bold;
    }
    .check-icon {
      background: #28a745;
      color: white;
    }
    .error-icon {
      background: #dc3545;
      color: white;
    }
    .card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
    }
    .form-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .form-card h3 {
      color: white;
      margin: 0 0 1.5rem 0;
      font-size: 1.25rem;
    }
    .form-group {
      margin-bottom: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .form-group label {
      font-weight: 500;
      font-size: 0.875rem;
    }
    .required {
      color: #ff6b6b;
    }
    .form-select,
    .form-input,
    .form-textarea {
      padding: 0.75rem 1rem;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      font-size: 0.875rem;
      background: rgba(255, 255, 255, 0.95);
      color: #333;
      transition: border-color 0.3s, box-shadow 0.3s;
    }
    .form-select:focus,
    .form-input:focus,
    .form-textarea:focus {
      outline: none;
      border-color: white;
      box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.2);
    }
    .form-select.invalid,
    .form-input.invalid,
    .form-textarea.invalid {
      border-color: #ff6b6b;
    }
    .form-select {
      cursor: pointer;
    }
    .form-textarea {
      resize: vertical;
      min-height: 100px;
    }
    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }
    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
    .char-count {
      text-align: right;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.7);
      margin-top: 0.25rem;
    }
    .error-text {
      color: #ffc107;
      font-size: 0.75rem;
    }
    .days-info {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1rem;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 10px;
      margin-bottom: 1.25rem;
    }
    .days-badge {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
    }
    .days-number {
      font-size: 2.5rem;
      font-weight: 700;
      color: white;
    }
    .days-label {
      font-size: 0.875rem;
      color: rgba(255, 255, 255, 0.8);
    }
    .days-note {
      margin: 0.5rem 0 0 0;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.7);
    }
    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
    }
    .btn-primary, .btn-secondary {
      padding: 0.75rem 2rem;
      border: none;
      border-radius: 8px;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
    }
    .btn-primary {
      background: #28a745;
      color: white;
    }
    .btn-primary:hover:not(:disabled) {
      background: #218838;
      transform: translateY(-1px);
    }
    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .btn-secondary {
      background: rgba(255, 255, 255, 0.2);
      color: white;
      border: 1px solid rgba(255, 255, 255, 0.3);
    }
    .btn-secondary:hover:not(:disabled) {
      background: rgba(255, 255, 255, 0.3);
    }
    .info-card h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.125rem;
    }
    .info-list {
      margin: 0;
      padding-left: 1.25rem;
      color: #555;
      line-height: 1.8;
    }
    .info-list li {
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
  `]
})
export class LeaveRequestComponent implements OnInit {
  today: string;
  calculatedDays = 0;
  submitting = false;
  successMessage = '';
  errorMessage = '';

  leaveFormData: CreateLeaveRequest = {
    leave_type: '' as any,
    start_date: '',
    end_date: '',
    reason: ''
  };

  constructor(
    private attendanceService: AttendanceService,
    private router: Router
  ) {
    const now = new Date();
    this.today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  ngOnInit(): void {}

  calculateDays(): void {
    if (!this.leaveFormData.start_date || !this.leaveFormData.end_date) {
      this.calculatedDays = 0;
      return;
    }

    const start = new Date(this.leaveFormData.start_date);
    const end = new Date(this.leaveFormData.end_date);

    if (end < start) {
      this.calculatedDays = 0;
      return;
    }

    let days = 0;
    const current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++;
      }
      current.setDate(current.getDate() + 1);
    }

    this.calculatedDays = days;
  }

  isFormValid(): boolean {
    return !!(
      this.leaveFormData.leave_type &&
      this.leaveFormData.start_date &&
      this.leaveFormData.end_date &&
      this.leaveFormData.reason?.trim() &&
      this.calculatedDays > 0
    );
  }

  submitLeave(): void {
    if (!this.isFormValid()) {
      return;
    }

    this.submitting = true;
    this.successMessage = '';
    this.errorMessage = '';

    this.attendanceService.createLeave(this.leaveFormData).subscribe({
      next: () => {
        this.submitting = false;
        this.successMessage = '请假申请提交成功！请等待管理员审批。';
        setTimeout(() => {
          this.router.navigate(['/employee/leaves']);
        }, 2000);
      },
      error: (err) => {
        this.submitting = false;
        if (err.status === 409) {
          this.errorMessage = '请假日期与已批准的请假记录重叠，请调整日期后重试。';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.error || '提交失败，请检查表单后重试。';
        } else {
          this.errorMessage = '提交失败，请稍后重试。';
        }
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/employee']);
  }
}
