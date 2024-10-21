require_relative 'grab'
require "dotenv"

# grabber = Grabber.new("./kim.json")

# grabber.login

# queries = [
#   "UX Design",
#   "UX Designer",
#   "UX Research",
#   "UX Researcher",
#   "User experience Design",
#   "User experience Designer",
#   "User experience Research",
#   "User experience Researcher",
#   "UI/UX Design",
#   "UI/UX Designer"
# ]

# includes = [
#   "UX",
#   "User experience"
# ]

# excludes = [
#   "senior",
#   "lead",
#   "principal"
# ]

# grabber.get(queries, includes, excludes)

grabber = Grabber.new("./kamy.json")

# grabber.login

queries = [
  "ios",
  "ios developer",
  "ios engineer",
  "swift",
  "swift developer",
  "swift engineer",
]

includes = [
  "ios",
  "swift"
]

excludes = [
  "junior",
  "intern"
]

grabber.get(queries, includes, excludes)