-- SmartAttend MySQL Database Schema for XAMPP
-- Import this file into phpMyAdmin (http://localhost/phpmyadmin)

CREATE DATABASE IF NOT EXISTS `smartattend_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `smartattend_db`;

-- --------------------------------------------------------
-- Table structure for `students`
-- --------------------------------------------------------
CREATE TABLE `attendance_codes` (
  `id` int(11) NOT NULL,
  `code` varchar(100) NOT NULL,
  `section` varchar(50) DEFAULT 'All',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) DEFAULT 1,
  `expires_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `attendance_codes`
--

INSERT INTO `attendance_codes` (`id`, `code`, `section`, `created_at`, `is_active`, `expires_at`) VALUES
(1, 'SMARTATTEND-QR-269258', 'All', '2026-09-22 18:34:08', 0, NULL),
(2, 'SMARTATTEND-QR-453742', 'All', '2026-09-22 18:34:09', 0, NULL),
(3, 'SMARTATTEND-QR-672579', 'All', '2026-09-22 18:34:09', 0, NULL),
(4, 'SMARTATTEND-QR-807448', 'All', '2026-09-22 20:23:01', 0, NULL),
(5, 'SMARTATTEND-QR-677959', 'All', '2026-09-22 20:37:12', 0, NULL),
(6, 'SMARTATTEND-QR-752875', 'All', '2026-09-22 20:38:03', 0, '2026-09-22 22:39:03'),
(7, 'SMARTATTEND-QR-448736', 'All', '2026-09-22 20:38:07', 0, '2026-09-22 23:38:07'),
(8, 'SMARTATTEND-QR-300924', 'All', '2026-09-22 20:38:13', 0, '2026-09-22 23:08:13'),
(9, 'SMARTATTEND-QR-425901', 'All', '2026-09-22 20:38:53', 0, '2026-09-22 23:08:53'),
(10, 'SMARTATTEND-QR-995256', 'All', '2026-09-22 20:38:58', 0, '2026-09-22 23:08:58'),
(11, 'SMARTATTEND-QR-786832', 'All', '2026-09-22 20:40:48', 0, '2026-09-24 04:40:48'),
(12, 'SMARTATTEND-QR-537577', 'All', '2026-09-22 20:41:07', 0, '2026-09-22 22:42:07'),
(13, 'SMARTATTEND-QR-585308', 'All', '2026-09-22 20:41:13', 0, '2026-09-22 22:43:13'),
(14, 'SMARTATTEND-QR-663135', 'All', '2026-09-22 20:41:17', 0, '2026-09-22 23:11:17'),
(15, 'SMARTATTEND-QR-669436', 'All', '2026-09-22 20:41:20', 0, '2026-09-22 23:11:20'),
(16, 'SMARTATTEND-QR-494270', 'All', '2026-09-22 20:41:22', 0, '2026-09-22 23:11:22'),
(17, 'SMARTATTEND-QR-802569', 'All', '2026-09-22 20:41:23', 0, '2026-09-22 23:11:23'),
(18, 'SMARTATTEND-QR-990932', 'All', '2026-09-22 20:41:25', 0, '2026-10-22 22:41:25'),
(19, 'SMARTATTEND-QR-410722', 'All', '2026-09-22 20:41:29', 0, '2026-09-24 04:41:29'),
(20, 'SMARTATTEND-QR-326910', 'All', '2026-09-22 20:41:32', 0, '2026-09-22 23:11:32'),
(21, 'SMARTATTEND-QR-170187', 'All', '2026-09-22 20:41:36', 0, '2026-09-23 22:41:36'),
(22, 'SMARTATTEND-QR-491081', 'All', '2026-09-22 20:43:32', 0, '2026-09-23 05:13:32'),
(23, 'SMARTATTEND-QR-337168', 'All', '2026-09-22 20:43:36', 0, '2026-09-23 04:44:36'),
(24, 'SMARTATTEND-QR-994145', 'All', '2026-09-24 00:10:09', 0, '2026-09-24 09:10:09'),
(25, 'SMARTATTEND-QR-546782', 'All', '2026-09-24 01:24:28', 0, '2026-09-24 09:54:28'),
(26, 'SMARTATTEND-QR-780826', 'All', '2026-10-12 04:59:34', 1, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `attendance_logs`
--

CREATE TABLE `attendance_logs` (
  `id` int(11) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `student_name` varchar(200) NOT NULL,
  `course_section` varchar(100) NOT NULL,
  `check_in_time` timestamp NOT NULL DEFAULT current_timestamp(),
  `status` enum('Present','Late','Absent') DEFAULT 'Present',
  `method` varchar(50) DEFAULT 'Web Camera Check-in'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `attendance_logs`
--

INSERT INTO `attendance_logs` (`id`, `student_id`, `student_name`, `course_section`, `check_in_time`, `status`, `method`) VALUES
(16, '1', 'test test', 'BSIT - 3-1', '2026-09-22 09:39:58', 'Present', 'QR Code Scan'),
(17, '1', 'test test', 'BSIT - 3-1', '2026-09-22 09:40:01', 'Present', 'QR Code Scan'),
(18, '00001', 'testtt testtt TEA', 'BSIT - 3-1', '2026-09-24 00:10:17', 'Present', 'QR Code Scan');

-- --------------------------------------------------------

--
-- Table structure for table `students`
--

CREATE TABLE `students` (
  `id` int(11) NOT NULL,
  `student_id` varchar(50) NOT NULL,
  `first_name` varchar(100) NOT NULL,
  `last_name` varchar(100) NOT NULL,
  `course` varchar(100) NOT NULL,
  `section` varchar(50) NOT NULL,
  `birth_date` date NOT NULL,
  `email` varchar(150) NOT NULL,
  `face_registered` tinyint(1) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `students`
--

INSERT INTO `students` (`id`, `student_id`, `first_name`, `last_name`, `course`, `section`, `birth_date`, `email`, `face_registered`, `created_at`) VALUES
(4, '00002', '123', '123', 'BSIT', '3-1', '2026-09-22', '123@gmail.com', 1, '2026-09-22 12:43:55'),
(6, 'teacher', 'TEST Faculty', 'Faculty', 'Teacher', 'Faculty', '2026-09-23', '', 1, '2026-09-23 15:08:49'),
(7, 'test', 'Test Test', 'Faculty', 'Teacher', 'Faculty', '2026-10-15', '', 1, '2026-10-15 12:38:00');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Teacher','Student') NOT NULL DEFAULT 'Student',
  `student_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_verified` tinyint(1) DEFAULT 0,
  `verification_code` varchar(10) DEFAULT NULL,
  `verification_expires_at` datetime DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `pending_email` varchar(150) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `username`, `password`, `role`, `student_id`, `created_at`, `is_verified`, `verification_code`, `verification_expires_at`, `email`, `avatar`, `pending_email`) VALUES
(1, 'Admin', 'admin', '$2y$10$kWxQ2.Zrr1CC/PitKq/moeExaVjeBQBVSNetrP1srrWvQ2Hz.lUeS', 'Admin', NULL, '2026-09-19 20:49:52', 1, '400034', '2026-10-16 08:17:46', 'admin@smartattend.website', '', NULL),
(2, 'TEST Faculty', 'teacher', '$2y$10$0917M5EiAH3BFqL1C7qAtuw7Zwe9xe0BCdsbIQxnCiwPG4/lDjl3y', 'Teacher', NULL, '2026-09-20 17:25:33', 1, '254947', '2026-10-16 08:29:31', 'hachiko0002@gmail.com', NULL, NULL),
(6, '123 123', '00002', '$2y$10$LhPvNQI7lHbcoe6BEGKgDOUYJS4eM9Gnok2ZsALxV73ieM3ylAVKa', 'Student', '00002', '2026-09-22 12:43:55', 0, NULL, NULL, '123@gmail.com', NULL, NULL),
(7, 'Test Test', 'test', '$2y$10$aJEZPmIu0M.2C.OKIPgcX.HxPklc1mHf2jIFQIiUb0DyyWaq44C/K', 'Teacher', NULL, '2026-09-23 14:02:24', 1, NULL, NULL, 'test@smartattend.website', NULL, NULL);

--
-- Indexes for dumped tables
--

--
-- Indexes for table `attendance_codes`
--
ALTER TABLE `attendance_codes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `students`
--
ALTER TABLE `students`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `student_id` (`student_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `attendance_codes`
--
ALTER TABLE `attendance_codes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=27;

--
-- AUTO_INCREMENT for table `attendance_logs`
--
ALTER TABLE `attendance_logs`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `students`
--
ALTER TABLE `students`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
