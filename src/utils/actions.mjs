export function deleteCompanyAfterConfirmation(company, remove, confirmAction = message => window.confirm(message)) {
  if (!company?.key || !company.count) return null
  if (!confirmAction(`Xóa ${company.count} hồ sơ kiểm tra của công ty "${company.name}"? Hành động này không thể hoàn tác.`)) return null
  return remove(company.key)
}
