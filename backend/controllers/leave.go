package controllers

import (
	"net/http"
	"time"

	"attendance/config"
	"attendance/models"
	"attendance/utils"

	"github.com/gin-gonic/gin"
)

type CreateLeaveRequest struct {
	LeaveType models.LeaveType `json:"leave_type" binding:"required"`
	StartDate string           `json:"start_date" binding:"required"`
	EndDate   string           `json:"end_date" binding:"required"`
	Reason    string           `json:"reason" binding:"required"`
}

type ApproveLeaveRequest struct {
	Status      models.LeaveStatus `json:"status" binding:"required"`
	ApprovalNote string           `json:"approval_note"`
}

const AnnualLeaveQuotaPerYear = 10

func CreateLeave(c *gin.Context) {
	userID := c.GetUint("user_id")
	var req CreateLeaveRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if req.LeaveType != models.LeaveTypePersonal &&
		req.LeaveType != models.LeaveTypeSick &&
		req.LeaveType != models.LeaveTypeAnnual {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid leave type"})
		return
	}

	startDate, err := time.ParseInLocation("2006-01-02", req.StartDate, time.UTC)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid start_date format, use YYYY-MM-DD"})
		return
	}
	endDate, err := time.ParseInLocation("2006-01-02", req.EndDate, time.UTC)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid end_date format, use YYYY-MM-DD"})
		return
	}

	if endDate.Before(startDate) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End date cannot be before start date"})
		return
	}

	days := models.CalculateWorkDays(req.StartDate, req.EndDate)
	if days == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No work days in the selected date range"})
		return
	}

	var overlappingLeaves []models.Leave
	config.DB.Where("user_id = ? AND status = ? AND (start_date <= ? AND end_date >= ?)",
		userID, models.LeaveStatusApproved, req.EndDate, req.StartDate).Find(&overlappingLeaves)

	if len(overlappingLeaves) > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "Leave request overlaps with existing approved leave"})
		return
	}

	if req.LeaveType == models.LeaveTypeAnnual {
		year := startDate.Year()
		startOfYear := time.Date(year, 1, 1, 0, 0, 0, 0, time.UTC).Format("2006-01-02")
		endOfYear := time.Date(year, 12, 31, 0, 0, 0, 0, time.UTC).Format("2006-01-02")

		var approvedAnnualLeaves []models.Leave
		config.DB.Where("user_id = ? AND leave_type = ? AND status = ? AND start_date >= ? AND end_date <= ?",
			userID, models.LeaveTypeAnnual, models.LeaveStatusApproved, startOfYear, endOfYear).Find(&approvedAnnualLeaves)

		usedDays := 0
		for _, leave := range approvedAnnualLeaves {
			usedDays += leave.Days
		}

		if usedDays+days > AnnualLeaveQuotaPerYear {
			remaining := AnnualLeaveQuotaPerYear - usedDays
			if remaining < 0 {
				remaining = 0
			}
			c.JSON(http.StatusBadRequest, gin.H{
				"error":          "Annual leave quota exceeded",
				"total_quota":    AnnualLeaveQuotaPerYear,
				"used_days":      usedDays,
				"remaining_days": remaining,
				"requested_days": days,
			})
			return
		}
	}

	leave := models.Leave{
		UserID:    userID,
		LeaveType: req.LeaveType,
		StartDate: req.StartDate,
		EndDate:   req.EndDate,
		Days:      days,
		Reason:    req.Reason,
		Status:    models.LeaveStatusPending,
	}

	config.DB.Create(&leave)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Leave request created successfully",
		"leave":   formatLeave(leave),
	})
}

func GetMyLeaves(c *gin.Context) {
	userID := c.GetUint("user_id")
	status := c.Query("status")

	query := config.DB.Where("user_id = ?", userID).Preload("Approver")

	if status != "" {
		query = query.Where("status = ?", status)
	}

	var leaves []models.Leave
	query.Order("created_at DESC").Find(&leaves)

	result := make([]map[string]interface{}, 0)
	for _, leave := range leaves {
		result = append(result, formatLeave(leave))
	}

	c.JSON(http.StatusOK, result)
}

func GetPendingLeaves(c *gin.Context) {
	var leaves []models.Leave
	config.DB.Where("status = ?", models.LeaveStatusPending).
		Preload("User").
		Preload("Approver").
		Order("created_at ASC").
		Find(&leaves)

	result := make([]map[string]interface{}, 0)
	for _, leave := range leaves {
		item := formatLeave(leave)
		item["user"] = map[string]interface{}{
			"id":       leave.User.ID,
			"username": leave.User.Username,
			"name":     leave.User.Name,
		}
		result = append(result, item)
	}

	c.JSON(http.StatusOK, result)
}

func GetAllLeaves(c *gin.Context) {
	status := c.Query("status")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")

	query := config.DB.Model(&models.Leave{}).Preload("User").Preload("Approver")

	if status != "" {
		query = query.Where("status = ?", status)
	}
	if startDate != "" {
		query = query.Where("start_date >= ?", startDate)
	}
	if endDate != "" {
		query = query.Where("end_date <= ?", endDate)
	}

	var leaves []models.Leave
	query.Order("created_at DESC").Find(&leaves)

	result := make([]map[string]interface{}, 0)
	for _, leave := range leaves {
		item := formatLeave(leave)
		if leave.User.ID > 0 {
			item["user"] = map[string]interface{}{
				"id":       leave.User.ID,
				"username": leave.User.Username,
				"name":     leave.User.Name,
			}
		}
		result = append(result, item)
	}

	c.JSON(http.StatusOK, result)
}

func ApproveLeave(c *gin.Context) {
	approverID := c.GetUint("user_id")
	leaveID := c.Param("id")

	var req ApproveLeaveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body: " + err.Error()})
		return
	}

	if req.Status != models.LeaveStatusApproved && req.Status != models.LeaveStatusRejected {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status. Must be 'approved' or 'rejected'"})
		return
	}

	var leave models.Leave
	result := config.DB.Where("id = ? AND status = ?", leaveID, models.LeaveStatusPending).First(&leave)
	if result.Error != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Pending leave not found"})
		return
	}

	leave.Status = req.Status
	leave.ApproverID = &approverID
	leave.ApprovalNote = req.ApprovalNote

	config.DB.Save(&leave)

	if req.Status == models.LeaveStatusApproved {
		workDays := models.GetWorkDaysBetween(leave.StartDate, leave.EndDate)
		for _, date := range workDays {
			var attendance models.Attendance
			result := config.DB.Where("user_id = ? AND date = ?", leave.UserID, date).First(&attendance)

			if result.Error != nil {
				attendance = models.Attendance{
					UserID:        leave.UserID,
					Date:          date,
					OverallStatus: models.StatusLeave,
				}
				config.DB.Create(&attendance)
			} else {
				attendance.OverallStatus = models.StatusLeave
				config.DB.Save(&attendance)
			}
		}
	}

	config.DB.Preload("User").Preload("Approver").First(&leave, leave.ID)

	item := formatLeave(leave)
	item["user"] = map[string]interface{}{
		"id":       leave.User.ID,
		"username": leave.User.Username,
		"name":     leave.User.Name,
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Leave " + string(req.Status) + " successfully",
		"leave":   item,
	})
}

func GetLeaveStats(c *gin.Context) {
	now := utils.Now()
	today := utils.FormatDate(now)
	currentYear, currentMonth, _ := now.Date()

	monthStart := time.Date(currentYear, currentMonth, 1, 0, 0, 0, 0, utils.ChinaLocation).Format("2006-01-02")
	monthEnd := time.Date(currentYear, currentMonth+1, 0, 0, 0, 0, 0, utils.ChinaLocation).Format("2006-01-02")

	var todayLeaveCount int64
	config.DB.Model(&models.Leave{}).Where(
		"status = ? AND start_date <= ? AND end_date >= ?",
		models.LeaveStatusApproved, today, today,
	).Count(&todayLeaveCount)

	var pendingCount int64
	config.DB.Model(&models.Leave{}).Where("status = ?", models.LeaveStatusPending).Count(&pendingCount)

	var monthlyLeaves []models.Leave
	config.DB.Where(
		"status = ? AND start_date >= ? AND end_date <= ?",
		models.LeaveStatusApproved, monthStart, monthEnd,
	).Find(&monthlyLeaves)

	typeByDays := make(map[models.LeaveType]int)
	for _, leave := range monthlyLeaves {
		typeByDays[leave.LeaveType] += leave.Days
	}

	leaveTypeDistribution := []map[string]interface{}{
		{"type": "personal", "label": "事假", "days": typeByDays[models.LeaveTypePersonal]},
		{"type": "sick", "label": "病假", "days": typeByDays[models.LeaveTypeSick]},
		{"type": "annual", "label": "年假", "days": typeByDays[models.LeaveTypeAnnual]},
	}

	c.JSON(http.StatusOK, gin.H{
		"today_leave_count":       todayLeaveCount,
		"monthly_pending_count":   pendingCount,
		"leave_type_distribution": leaveTypeDistribution,
	})
}

func formatLeave(leave models.Leave) map[string]interface{} {
	item := map[string]interface{}{
		"id":           leave.ID,
		"user_id":      leave.UserID,
		"leave_type":   leave.LeaveType,
		"start_date":   leave.StartDate,
		"end_date":     leave.EndDate,
		"days":         leave.Days,
		"reason":       leave.Reason,
		"status":       leave.Status,
		"approver_id":  leave.ApproverID,
		"approval_note": leave.ApprovalNote,
		"created_at":   utils.FormatDateTime(leave.CreatedAt),
		"updated_at":   utils.FormatDateTime(leave.UpdatedAt),
	}

	if leave.Approver != nil && leave.Approver.ID > 0 {
		item["approver"] = map[string]interface{}{
			"id":   leave.Approver.ID,
			"name": leave.Approver.Name,
		}
	}

	return item
}
