package models

import (
	"time"

	"gorm.io/gorm"
)

type LeaveType string

const (
	LeaveTypePersonal LeaveType = "personal"
	LeaveTypeSick     LeaveType = "sick"
	LeaveTypeAnnual   LeaveType = "annual"
)

type LeaveStatus string

const (
	LeaveStatusPending  LeaveStatus = "pending"
	LeaveStatusApproved LeaveStatus = "approved"
	LeaveStatusRejected LeaveStatus = "rejected"
)

type Leave struct {
	ID           uint           `json:"id" gorm:"primaryKey"`
	UserID       uint           `json:"user_id" gorm:"index;not null"`
	LeaveType    LeaveType      `json:"leave_type" gorm:"size:20;not null"`
	StartDate    string         `json:"start_date" gorm:"type:date;not null;index"`
	EndDate      string         `json:"end_date" gorm:"type:date;not null;index"`
	Days         int            `json:"days" gorm:"not null"`
	Reason       string         `json:"reason" gorm:"type:text;not null"`
	Status       LeaveStatus    `json:"status" gorm:"size:20;not null;default:'pending';index"`
	ApproverID   *uint          `json:"approver_id" gorm:"index"`
	ApprovalNote string         `json:"approval_note" gorm:"type:text"`
	CreatedAt    time.Time      `json:"created_at"`
	UpdatedAt    time.Time      `json:"updated_at"`
	DeletedAt    gorm.DeletedAt `json:"-" gorm:"index"`

	User     User  `json:"user" gorm:"foreignKey:UserID"`
	Approver *User `json:"approver" gorm:"foreignKey:ApproverID"`
}

func CalculateWorkDays(startDate, endDate string) int {
	start, err := time.ParseInLocation("2006-01-02", startDate, time.UTC)
	if err != nil {
		return 0
	}
	end, err := time.ParseInLocation("2006-01-02", endDate, time.UTC)
	if err != nil {
		return 0
	}

	days := 0
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		weekday := d.Weekday()
		if weekday != time.Saturday && weekday != time.Sunday {
			days++
		}
	}
	return days
}

func DatesOverlap(start1, end1, start2, end2 string) bool {
	s1, err := time.ParseInLocation("2006-01-02", start1, time.UTC)
	if err != nil {
		return false
	}
	e1, err := time.ParseInLocation("2006-01-02", end1, time.UTC)
	if err != nil {
		return false
	}
	s2, err := time.ParseInLocation("2006-01-02", start2, time.UTC)
	if err != nil {
		return false
	}
	e2, err := time.ParseInLocation("2006-01-02", end2, time.UTC)
	if err != nil {
		return false
	}

	return s1.Before(e2.AddDate(0, 0, 1)) && s2.Before(e1.AddDate(0, 0, 1))
}

func GetWorkDaysBetween(startDate, endDate string) []string {
	start, err := time.ParseInLocation("2006-01-02", startDate, time.UTC)
	if err != nil {
		return nil
	}
	end, err := time.ParseInLocation("2006-01-02", endDate, time.UTC)
	if err != nil {
		return nil
	}

	var days []string
	for d := start; !d.After(end); d = d.AddDate(0, 0, 1) {
		weekday := d.Weekday()
		if weekday != time.Saturday && weekday != time.Sunday {
			days = append(days, d.Format("2006-01-02"))
		}
	}
	return days
}
