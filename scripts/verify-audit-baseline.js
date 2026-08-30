const fs = require('fs')

const reportPath = process.argv[2] || 'npm-audit-report.json'
const acceptedHighPackages = new Set(['vuetify'])

let report
try {
  report = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
} catch (error) {
  console.error(`Unable to read npm audit report: ${error.message}`)
  process.exit(1)
}

const vulnerabilities = Object.values(report.vulnerabilities || {})
const critical = vulnerabilities.filter((item) => item.severity === 'critical')
const unexpectedHigh = vulnerabilities.filter(
  (item) => item.severity === 'high' && !acceptedHighPackages.has(item.name)
)

if (critical.length || unexpectedHigh.length) {
  const names = [...critical, ...unexpectedHigh].map((item) => item.name)
  console.error(`Unaccepted High/Critical vulnerabilities: ${names.join(', ')}`)
  process.exit(1)
}

const acceptedHigh = vulnerabilities.filter(
  (item) => item.severity === 'high' && acceptedHighPackages.has(item.name)
)

if (acceptedHigh.length !== acceptedHighPackages.size) {
  console.error('The audit result no longer matches the documented High-risk baseline')
  process.exit(1)
}

console.log('Audit matches the documented baseline: accepted High=vuetify, Critical=0')
