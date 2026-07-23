"use client";

import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserCircle, Save, Loader2, KeyRound, Phone, User as UserIcon, Shield } from "lucide-react";
import { toast } from "sonner";
import { toJalali } from "@/lib/persian";

export function ProfileView() {
  const { user, setUser } = useApp();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    api("/api/profile")
      .then((r: any) => {
        setProfile(r.user);
        setFullName(r.user.fullName);
        setPhone(r.user.phone || "");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveProfile() {
    if (!fullName.trim()) {
      toast.error("نام کامل الزامی است");
      return;
    }
    setSaving(true);
    try {
      const body: any = { fullName, phone };
      if (newPassword) {
        if (newPassword !== confirmPassword) {
          toast.error("رمز جدید و تکرار آن یکسان نیستند");
          setSaving(false);
          return;
        }
        if (newPassword.length < 6) {
          toast.error("رمز جدید باید حداقل ۶ کاراکتر باشد");
          setSaving(false);
          return;
        }
        body.currentPassword = currentPassword;
        body.newPassword = newPassword;
      }
      const r: any = await api("/api/profile", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setProfile(r.user);
      setUser({ ...user!, fullName: r.user.fullName });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      toast.success("پروفایل با موفقیت ذخیره شد");
    } catch (e: any) {
      toast.error(e.message || "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="grid place-items-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <UserCircle className="h-6 w-6 text-primary" />
          پروفایل من
        </h1>
        <p className="text-sm text-muted-foreground mt-1">مدیریت اطلاعات حساب کاربری و رمز عبور</p>
      </div>

      {/* Profile header card */}
      <Card>
        <CardContent className="p-4 lg:p-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 text-primary text-2xl font-bold shrink-0">
              {profile?.fullName?.split(" ").map((s: string) => s[0]).filter(Boolean).slice(0, 2).join("") || "؟"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{profile?.fullName}</h2>
              <p className="text-sm text-muted-foreground" dir="ltr">@{profile?.username}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge variant="outline" className={profile?.role === "ADMIN" ? "border-primary/40 bg-primary/10 text-primary text-[10px]" : "text-[10px]"}>
                  <Shield className="h-3 w-3 ml-1" />
                  {profile?.role === "ADMIN" ? "مدیر سامانه" : "پزشک"}
                </Badge>
                {profile?.group && (
                  <Badge variant="outline" className="text-[10px]">
                    <span className="w-2 h-2 rounded-full ml-1" style={{ background: profile.group.color }} />
                    {profile.group.name}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            ویرایش اطلاعات
          </CardTitle>
          <CardDescription>نام و شماره تماس خود را به‌روز کنید</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">نام و نام خانوادگی</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center gap-1"><Phone className="h-3 w-3" />شماره تماس</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" className="text-left font-mono" placeholder="09xxxxxxxxx" />
          </div>
        </CardContent>
      </Card>

      {/* Change password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            تغییر رمز عبور
          </CardTitle>
          <CardDescription>برای امنیت بیشتر، رمز خود را定期اً تغییر دهید</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">رمز فعلی</Label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} dir="ltr" className="text-left font-mono" placeholder="••••••••" />
          </div>
          <Separator />
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">رمز جدید (حداقل ۶ کاراکتر)</Label>
              <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} dir="ltr" className="text-left font-mono" placeholder="••••••••" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">تکرار رمز جدید</Label>
              <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} dir="ltr" className="text-left font-mono" placeholder="••••••••" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-2">
        <Button onClick={saveProfile} disabled={saving} size="lg" className="min-w-32">
          {saving ? <Loader2 className="h-4 w-4 ml-1 animate-spin" /> : <Save className="h-4 w-4 ml-1" />}
          ذخیره تغییرات
        </Button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        حساب کاربری از {toJalali(profile?.createdAt)} فعال است
      </p>
    </div>
  );
}
