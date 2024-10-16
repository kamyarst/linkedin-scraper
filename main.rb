require_relative 'grab'
require "dotenv"

Dotenv.load(".env-kim")

grabber = Grabber.new

queries = [
  "UX Design",
  "UX Designer",
  "UX Research",
  "UX Researcher",
  "User experience Design",
  "User experience Designer",
  "User experience Research",
  "User experience Researcher",
  "UI/UX Design",
  "UI/UX Designer"
]

includes = [
  "UX",
  "User experience"
]

excludes = [
  "senior",
  "lead",
  "principal"
]

grabber.get(queries, includes, excludes)

# Dotenv.load(".env-kamy")
# queries = [
#   "ios developer",
#   "ios",
#   "ios engineer",
#   "swift developer",
#   "swift engineer",
#   "swift",
# ]

# includes = [
#   "ios",
#   "swift"
# ]

# excludes = [
#   "junior"
# ]

# grabber.get(queries, includes, excludes)