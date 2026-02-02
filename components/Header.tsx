import LogoutButton from "./header/LogOutButton";

type HeaderProps = {
    email: string;
}

export default function Header({ email }: HeaderProps) {

    return (
        <header className="w-full flex items-center justify-between p-4 backdrop-blur-2xl supports-[backdrop-filter]:bg-background/50">
          <div></div>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm sm:mt-0">
              <div className="text-sm hidden md:block">
                  <span className="font-medium">{email ?? "—"}</span>
              </div>
              <LogoutButton />
          </div>
      </header>
    );

}
