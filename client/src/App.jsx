import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import About from './pages/About.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import AdmissionForm from './pages/AdmissionForm.jsx';
import Compare from './pages/Compare.jsx';
import Contact from './pages/Contact.jsx';
import ContentDetail from './pages/ContentDetail.jsx';
import ContentList from './pages/ContentList.jsx';
import Counselling from './pages/Counselling.jsx';
import Faq from './pages/Faq.jsx';
import Home from './pages/Home.jsx';
import InstitutionDashboard from './pages/institution/InstitutionDashboard.jsx';
import InstitutionDetail from './pages/InstitutionDetail.jsx';
import Legal from './pages/Legal.jsx';
import Listing from './pages/Listing.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Register from './pages/Register.jsx';
import SpotAdmission from './pages/SpotAdmission.jsx';
import StudentDashboard from './pages/student/StudentDashboard.jsx';
import Testimonials from './pages/Testimonials.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="institutions" element={<Listing />} />
        <Route path="schools" element={<Listing preset={{ type: 'school' }} />} />
        <Route path="colleges" element={<Listing preset={{ type: 'college' }} />} />
        <Route path="directory" element={<Listing />} />
        <Route path="institutions/:slug" element={<InstitutionDetail />} />
        <Route path="compare" element={<Compare />} />
        <Route path="spot-admission" element={<SpotAdmission />} />
        <Route path="counselling" element={<Counselling />} />
        <Route path="career-guidance" element={<Counselling preset="career" />} />
        <Route path="admission-form" element={<AdmissionForm />} />
        <Route path="news" element={<ContentList kinds="article,news" title="News & Articles" />} />
        <Route path="exams" element={<ContentList kinds="exam" title="Exams & Results" />} />
        <Route path="podcasts" element={<ContentList kinds="podcast" title="TheSpotAdmission Podcast" />} />
        <Route path="virtual-tours" element={<ContentList kinds="virtual-tour" title="Virtual Campus Tours" />} />
        <Route path="content/:slug" element={<ContentDetail />} />
        <Route path="testimonials" element={<Testimonials />} />
        <Route path="about" element={<About />} />
        <Route path="contact" element={<Contact />} />
        <Route path="faq" element={<Faq />} />
        <Route path="privacy" element={<Legal kind="privacy" />} />
        <Route path="terms" element={<Legal kind="terms" />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="institution/register" element={<Register institution />} />
        <Route
          path="student/*"
          element={
            <ProtectedRoute roles={['student', 'counsellor']}>
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="institution/*"
          element={
            <ProtectedRoute roles={['institution', 'admin']}>
              <InstitutionDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/*"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
