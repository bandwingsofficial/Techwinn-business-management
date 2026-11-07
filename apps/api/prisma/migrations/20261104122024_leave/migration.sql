-- Add the leave_requests → leave_year_configurations FK omitted from
-- 20261104111340_leave_management.
--
-- Do NOT alter leave_year_configurations.name here: that column is added later
-- by 20261104190000_leave_year_configuration_name.

-- AddForeignKey
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_leave_year_configuration_id_fkey" FOREIGN KEY ("leave_year_configuration_id") REFERENCES "leave_year_configurations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
