# `.scratch/` — local working space, not tracked

Everything in this folder is git-ignored except this README. Use it for anything throwaway: experiments,
scratch scripts, debugging output, notes you don't want in a commit.

A genesis build also uses it for its own state while running — where it got to, what it's waiting on — so if a
build pauses partway through, this is where it picks up from. Deleting the contents mid-build loses that place.
Otherwise the contents are safe to delete whenever you like.

Nothing secret goes here, same as anywhere else.
